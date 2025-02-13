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
  try {
    const movies = await db.getLatestMovies();
    const tvshows = await db.getLatestTVShows();
    res.render('admin/dashboard', { movies, tvshows });
  } catch (err) {
    console.error('Dashboard error:', err);
    res.render('admin/dashboard', { movies: [], tvshows: [], error: 'Failed to load content' });
  }
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
    console.error('Add movie error:', err);
    res.render('admin/add-movie', { error: 'Failed to add movie: ' + err.message });
  }
});

// Edit movie form
router.get('/movies/edit/:id', isAdmin, async (req, res) => {
  try {
    const movie = await db.getMovieById(req.params.id);
    if (!movie) {
      return res.redirect('/admin');
    }
    const servers = await db.getMovieServers(req.params.id);
    movie.servers = servers;
    res.render('admin/edit-movie', { movie });
  } catch (err) {
    console.error('Edit movie form error:', err);
    res.redirect('/admin');
  }
});

// Update movie
router.post('/movies/edit/:id', isAdmin, upload.single('poster'), async (req, res) => {
  try {
    const movie = await db.getMovieById(req.params.id);
    if (!movie) {
      return res.redirect('/admin');
    }

    const { title, type, description, servers } = req.body;
    const updateData = { title, type, description };
    
    if (req.file) {
      updateData.poster = '/uploads/' + req.file.filename;
      // Delete old poster
      if (movie.poster) {
        const oldPosterPath = path.join(__dirname, '../public', movie.poster);
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
    console.error('Update movie error:', err);
    const movie = await db.getMovieById(req.params.id);
    const servers = await db.getMovieServers(req.params.id);
    movie.servers = servers;
    res.render('admin/edit-movie', { movie, error: 'Failed to update movie: ' + err.message });
  }
});

// Delete movie
router.post('/movies/delete/:id', isAdmin, async (req, res) => {
  try {
    const movie = await db.getMovieById(req.params.id);
    if (movie && movie.poster) {
      const posterPath = path.join(__dirname, '../public', movie.poster);
      fs.unlink(posterPath, () => {});
    }
    await db.deleteMovie(req.params.id);
    res.redirect('/admin');
  } catch (err) {
    console.error('Delete movie error:', err);
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
    const { title, description, seasons, episodes } = req.body;
    
    if (!episodes || !Array.isArray(episodes)) {
      throw new Error('No episodes provided');
    }

    const poster = '/uploads/' + req.file.filename;
    const tvshowId = await db.addTVShow(title, poster, description, seasons);
    
    // Handle episodes and servers
    for (const episode of episodes) {
      if (!episode.season || !episode.number) {
        continue;
      }
      
      const episodeId = await db.addTVShowEpisode(tvshowId, episode.season, episode.number);
      
      if (episode.servers && Array.isArray(episode.servers)) {
        for (const server of episode.servers) {
          if (server.name && server.url) {
            await db.addEpisodeServer(episodeId, server.name, server.url);
          }
        }
      }
    }
    
    res.redirect('/admin');
  } catch (err) {
    console.error('Add TV show error:', err);
    res.render('admin/add-tvshow', { error: 'Failed to add TV show: ' + err.message });
  }
});

// Edit TV show form
router.get('/tvshows/edit/:id', isAdmin, async (req, res) => {
  try {
    const tvshow = await db.getTVShowById(req.params.id);
    if (!tvshow) {
      return res.redirect('/admin');
    }
    const episodes = await db.getTVShowEpisodes(req.params.id);
    
    // Get servers for each episode
    for (const episode of episodes) {
      episode.servers = await db.getEpisodeServers(episode.id);
    }
    
    res.render('admin/edit-tvshow', { tvshow, episodes });
  } catch (err) {
    console.error('Edit TV show form error:', err);
    res.redirect('/admin');
  }
});

// Update TV show
router.post('/tvshows/edit/:id', isAdmin, upload.single('poster'), async (req, res) => {
  try {
    const tvshow = await db.getTVShowById(req.params.id);
    if (!tvshow) {
      throw new Error('TV show not found');
    }

    const { title, description, seasons } = req.body;
    const updateData = { title, description, seasons };
    
    if (req.file) {
      updateData.poster = '/uploads/' + req.file.filename;
      // Delete old poster
      if (tvshow.poster) {
        const oldPosterPath = path.join(__dirname, '../public', tvshow.poster);
        fs.unlink(oldPosterPath, () => {});
      }
    }
    
    await db.updateTVShow(req.params.id, updateData);
    
    // Process episodes data
    const episodes = [];
    if (req.body.episodes) {
      for (const [index, episode] of Object.entries(req.body.episodes)) {
        if (episode && episode.season && episode.number) {
          const episodeData = {
            id: episode.id || null,
            season: parseInt(episode.season),
            number: parseInt(episode.number),
            servers: []
          };

          // Process servers for this episode
          if (episode.servers) {
            for (const server of Object.values(episode.servers)) {
              if (server.name && server.url) {
                episodeData.servers.push({
                  name: server.name,
                  url: server.url
                });
              }
            }
          }
          
          episodes.push(episodeData);
        }
      }
    }
    
    // Update episodes and servers
    for (const episode of episodes) {
      let episodeId;
      if (episode.id) {
        await db.updateTVShowEpisode(episode.id, episode.season, episode.number);
        await db.deleteEpisodeServers(episode.id);
        episodeId = episode.id;
      } else {
        episodeId = await db.addTVShowEpisode(req.params.id, episode.season, episode.number);
      }
      
      // Add servers for the episode
      for (const server of episode.servers) {
        await db.addEpisodeServer(episodeId, server.name, server.url);
      }
    }
    
    res.redirect('/admin');
  } catch (err) {
    console.error('Update TV show error:', err);
    try {
      const tvshow = await db.getTVShowById(req.params.id);
      const episodes = await db.getTVShowEpisodes(req.params.id);
      for (const episode of episodes) {
        episode.servers = await db.getEpisodeServers(episode.id);
      }
      res.render('admin/edit-tvshow', { 
        tvshow, 
        episodes, 
        error: 'Failed to update TV show: ' + err.message 
      });
    } catch (renderErr) {
      console.error('Error rendering error page:', renderErr);
      res.redirect('/admin');
    }
  }
});

// Delete TV show
router.post('/tvshows/delete/:id', isAdmin, async (req, res) => {
  try {
    const tvshow = await db.getTVShowById(req.params.id);
    if (tvshow && tvshow.poster) {
      const posterPath = path.join(__dirname, '../public', tvshow.poster);
      fs.unlink(posterPath, () => {});
    }
    await db.deleteTVShow(req.params.id);
    res.redirect('/admin');
  } catch (err) {
    console.error('Delete TV show error:', err);
    res.redirect('/admin');
  }
});

module.exports = router;