const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../database');

// Middleware to check if user is admin
const isAdmin = (req, res, next) => {
  if (req.session.user && req.session.user.is_admin) {
    next();
  } else {
    res.redirect('/auth/login');
  }
};

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'src/public/uploads');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

// Admin dashboard
router.get('/', isAdmin, async (req, res) => {
  const movies = await db.getLatestMovies();
  const tvshows = await db.getLatestTVShows();
  res.render('admin/dashboard', { movies, tvshows });
});

// Add movie form
router.get('/movies/add', isAdmin, (req, res) => {
  res.render('admin/add-movie');
});

// Add movie process
router.post('/movies/add', isAdmin, upload.single('poster'), async (req, res) => {
  try {
    const { title, type, description } = req.body;
    const poster = '/uploads/' + req.file.filename;
    const movieId = await db.addMovie(title, type, poster, description);
    
    // Handle servers
    const servers = req.body.servers || [];
    for (const server of servers) {
      await db.addMovieServer(movieId, server.name, server.url);
    }
    
    res.redirect('/admin');
  } catch (err) {
    res.render('admin/add-movie', { error: 'Failed to add movie' });
  }
});

// Edit movie form
router.get('/movies/edit/:id', isAdmin, async (req, res) => {
  try {
    const movie = await db.getMovieById(req.params.id);
    const servers = await db.getMovieServers(req.params.id);
    movie.servers = servers;
    res.render('admin/edit-movie', { movie });
  } catch (err) {
    res.redirect('/admin');
  }
});

// Update movie
router.post('/movies/edit/:id', isAdmin, upload.single('poster'), async (req, res) => {
  try {
    const { title, type, description, servers } = req.body;
    const updateData = { title, type, description };
    
    if (req.file) {
      updateData.poster = '/uploads/' + req.file.filename;
      // Delete old poster
      const oldMovie = await db.getMovieById(req.params.id);
      if (oldMovie.poster) {
        const oldPosterPath = path.join(__dirname, '../public', oldMovie.poster);
        fs.unlink(oldPosterPath, () => {});
      }
    }
    
    await db.updateMovie(req.params.id, updateData);
    
    // Update servers
    await db.deleteMovieServers(req.params.id);
    if (servers) {
      for (const server of servers) {
        await db.addMovieServer(req.params.id, server.name, server.url);
      }
    }
    
    res.redirect('/admin');
  } catch (err) {
    res.render('admin/edit-movie', { error: 'Failed to update movie' });
  }
});

// Delete movie
router.post('/movies/delete/:id', isAdmin, async (req, res) => {
  try {
    const movie = await db.getMovieById(req.params.id);
    if (movie.poster) {
      const posterPath = path.join(__dirname, '../public', movie.poster);
      fs.unlink(posterPath, () => {});
    }
    await db.deleteMovie(req.params.id);
    res.redirect('/admin');
  } catch (err) {
    res.redirect('/admin');
  }
});

// Add TV show form
router.get('/tvshows/add', isAdmin, (req, res) => {
  res.render('admin/add-tvshow');
});

// Add TV show process
router.post('/tvshows/add', isAdmin, upload.single('poster'), async (req, res) => {
  try {
    const { title, description, seasons } = req.body;
    const poster = '/uploads/' + req.file.filename;
    const tvshowId = await db.addTVShow(title, poster, description, seasons);
    
    // Handle episodes and servers
    const episodes = req.body.episodes || [];
    for (const episode of episodes) {
      const episodeId = await db.addTVShowEpisode(tvshowId, episode.season, episode.number);
      if (episode.servers) {
        for (const server of episode.servers) {
          await db.addEpisodeServer(episodeId, server.name, server.url);
        }
      }
    }
    
    res.redirect('/admin');
  } catch (err) {
    res.render('admin/add-tvshow', { error: 'Failed to add TV show' });
  }
});

// Edit TV show form
router.get('/tvshows/edit/:id', isAdmin, async (req, res) => {
  try {
    const tvshow = await db.getTVShowById(req.params.id);
    const episodes = await db.getTVShowEpisodes(req.params.id);
    
    // Get servers for each episode
    for (const episode of episodes) {
      episode.servers = await db.getEpisodeServers(episode.id);
    }
    
    res.render('admin/edit-tvshow', { tvshow, episodes });
  } catch (err) {
    res.redirect('/admin');
  }
});

// Update TV show
router.post('/tvshows/edit/:id', isAdmin, upload.single('poster'), async (req, res) => {
  try {
    const { title, description, seasons, episodes } = req.body;
    const updateData = { title, description, seasons };
    
    if (req.file) {
      updateData.poster = '/uploads/' + req.file.filename;
      // Delete old poster
      const oldTVShow = await db.getTVShowById(req.params.id);
      if (oldTVShow.poster) {
        const oldPosterPath = path.join(__dirname, '../public', oldTVShow.poster);
        fs.unlink(oldPosterPath, () => {});
      }
    }
    
    await db.updateTVShow(req.params.id, updateData);
    
    // Update episodes and servers
    if (episodes) {
      for (const episode of episodes) {
        if (episode.id) {
          // Update existing episode
          await db.updateTVShowEpisode(episode.id, episode.season, episode.number);
          await db.deleteEpisodeServers(episode.id);
        } else {
          // Add new episode
          episode.id = await db.addTVShowEpisode(req.params.id, episode.season, episode.number);
        }
        
        // Add servers for the episode
        if (episode.servers) {
          for (const server of episode.servers) {
            await db.addEpisodeServer(episode.id, server.name, server.url);
          }
        }
      }
    }
    
    res.redirect('/admin');
  } catch (err) {
    res.render('admin/edit-tvshow', { error: 'Failed to update TV show' });
  }
});

// Delete TV show
router.post('/tvshows/delete/:id', isAdmin, async (req, res) => {
  try {
    const tvshow = await db.getTVShowById(req.params.id);
    if (tvshow.poster) {
      const posterPath = path.join(__dirname, '../public', tvshow.poster);
      fs.unlink(posterPath, () => {});
    }
    await db.deleteTVShow(req.params.id);
    res.redirect('/admin');
  } catch (err) {
    res.redirect('/admin');
  }
});

module.exports = router;