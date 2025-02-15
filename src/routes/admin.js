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
    const uploadsDir = path.join(__dirname, '../public/uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    cb(null, uploadsDir);
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
    const { 
      title, 
      type, 
      description, 
      genres, 
      language, 
      releaseDate, 
      runtime, 
      servers,
      credits 
    } = req.body;

    if (!req.file) {
      throw new Error('Poster image is required');
    }

    const poster = '/uploads/' + req.file.filename;
    const selectedGenres = Array.isArray(genres) ? genres : [];

    const movieId = await db.addMovie(
      title,
      type,
      poster,
      description,
      selectedGenres,
      language,
      releaseDate,
      runtime
    );
    
    // Handle servers
    if (servers && typeof servers === 'object') {
      const serverEntries = Object.entries(servers);
      for (const [index, server] of serverEntries) {
        if (server.name && server.url) {
          await db.addMovieServer(movieId, server.name, server.url);
        }
      }
    }

    // Handle credits
    if (credits && typeof credits === 'object') {
      for (const role in credits) {
        if (Array.isArray(credits[role])) {
          for (const name of credits[role]) {
            if (name.trim()) {
              await db.addCredit(movieId, 'movie', role, name.trim());
            }
          }
        }
      }
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
    const credits = await db.getCredits(req.params.id, 'movie');
    movie.servers = servers;
    movie.credits = credits;
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

    const { 
      title, 
      type, 
      description, 
      genres, 
      language, 
      releaseDate, 
      runtime, 
      servers,
      credits 
    } = req.body;

    const updateData = { 
      title, 
      type, 
      description,
      genres: Array.isArray(genres) ? genres : [],
      language,
      release_date: releaseDate,
      runtime
    };
    
    if (req.file) {
      updateData.poster = '/uploads/' + req.file.filename;
      if (movie.poster) {
        const oldPosterPath = path.join(__dirname, '../public', movie.poster);
        fs.unlink(oldPosterPath, (err) => {
          if (err && err.code !== 'ENOENT') {
            console.error('Error deleting old poster:', err);
          }
        });
      }
    }
    
    await db.updateMovie(req.params.id, updateData);
    
    // Update servers
    await db.deleteMovieServers(req.params.id);
    if (servers && typeof servers === 'object') {
      const serverEntries = Object.entries(servers);
      for (const [index, server] of serverEntries) {
        if (server.name && server.url) {
          await db.addMovieServer(req.params.id, server.name, server.url);
        }
      }
    }

    // Update credits
    await db.deleteCredits(req.params.id, 'movie');
    if (credits && typeof credits === 'object') {
      for (const role in credits) {
        if (Array.isArray(credits[role])) {
          for (const name of credits[role]) {
            if (name.trim()) {
              await db.addCredit(req.params.id, 'movie', role, name.trim());
            }
          }
        }
      }
    }
    
    res.redirect('/admin');
  } catch (err) {
    console.error('Update movie error:', err);
    const movie = await db.getMovieById(req.params.id);
    const servers = await db.getMovieServers(req.params.id);
    const credits = await db.getCredits(req.params.id, 'movie');
    movie.servers = servers;
    movie.credits = credits;
    res.render('admin/edit-movie', { movie, error: 'Failed to update movie: ' + err.message });
  }
});

// Delete movie
router.post('/movies/delete/:id', isAdmin, async (req, res) => {
  try {
    const movie = await db.getMovieById(req.params.id);
    if (movie && movie.poster) {
      const posterPath = path.join(__dirname, '../public', movie.poster);
      fs.unlink(posterPath, (err) => {
        if (err && err.code !== 'ENOENT') {
          console.error('Error deleting poster:', err);
        }
      });
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
    const { 
      title, 
      description, 
      genres,
      language,
      releaseDate,
      runtime,
      seasons, 
      totalEpisodes,
      episodes,
      credits 
    } = req.body;
    
    if (!req.file) {
      throw new Error('Poster image is required');
    }

    const poster = '/uploads/' + req.file.filename;
    const selectedGenres = Array.isArray(genres) ? genres : [];

    const tvshowId = await db.addTVShow(
      title,
      poster,
      description,
      selectedGenres,
      language,
      releaseDate,
      runtime,
      seasons,
      totalEpisodes
    );
    
    // Handle episodes and servers
    if (episodes && typeof episodes === 'object') {
      const episodeEntries = Object.entries(episodes);
      for (const [index, episode] of episodeEntries) {
        if (!episode.season || !episode.number) continue;
        
        const episodeId = await db.addTVShowEpisode(tvshowId, episode.season, episode.number);
        
        if (episode.servers && typeof episode.servers === 'object') {
          const serverEntries = Object.entries(episode.servers);
          for (const [serverIndex, server] of serverEntries) {
            if (server.name && server.url) {
              await db.addEpisodeServer(episodeId, server.name, server.url);
            }
          }
        }
      }
    }

    // Handle credits
    if (credits && typeof credits === 'object') {
      for (const role in credits) {
        if (Array.isArray(credits[role])) {
          for (const name of credits[role]) {
            if (name.trim()) {
              await db.addCredit(tvshowId, 'tvshow', role, name.trim());
            }
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
    const credits = await db.getCredits(req.params.id, 'tvshow');
    
    // Get servers for each episode
    for (const episode of episodes) {
      episode.servers = await db.getEpisodeServers(episode.id);
    }
    
    res.render('admin/edit-tvshow', { tvshow, episodes, credits });
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

    const { 
      title, 
      description, 
      genres,
      language,
      releaseDate,
      runtime,
      seasons,
      totalEpisodes,
      episodes,
      credits 
    } = req.body;

    const updateData = { 
      title, 
      description,
      genres: Array.isArray(genres) ? genres : [],
      language,
      release_date: releaseDate,
      runtime,
      seasons,
      total_episodes: totalEpisodes
    };
    
    if (req.file) {
      updateData.poster = '/uploads/' + req.file.filename;
      if (tvshow.poster) {
        const oldPosterPath = path.join(__dirname, '../public', tvshow.poster);
        fs.unlink(oldPosterPath, (err) => {
          if (err && err.code !== 'ENOENT') {
            console.error('Error deleting old poster:', err);
          }
        });
      }
    }
    
    await db.updateTVShow(req.params.id, updateData);
    
    // Process episodes data
    if (episodes && typeof episodes === 'object') {
      const episodeEntries = Object.entries(episodes);
      for (const [index, episode] of episodeEntries) {
        if (!episode || !episode.season || !episode.number) continue;

        let episodeId = episode.id;
        if (episodeId) {
          await db.updateTVShowEpisode(episodeId, episode.season, episode.number);
          await db.deleteEpisodeServers(episodeId);
        } else {
          episodeId = await db.addTVShowEpisode(req.params.id, episode.season, episode.number);
        }
        
        if (episode.servers && typeof episode.servers === 'object') {
          const serverEntries = Object.entries(episode.servers);
          for (const [serverIndex, server] of serverEntries) {
            if (server.name && server.url) {
              await db.addEpisodeServer(episodeId, server.name, server.url);
            }
          }
        }
      }
    }

    // Update credits
    await db.deleteCredits(req.params.id, 'tvshow');
    if (credits && typeof credits === 'object') {
      for (const role in credits) {
        if (Array.isArray(credits[role])) {
          for (const name of credits[role]) {
            if (name.trim()) {
              await db.addCredit(req.params.id, 'tvshow', role, name.trim());
            }
          }
        }
      }
    }
    
    res.redirect('/admin');
  } catch (err) {
    console.error('Update TV show error:', err);
    try {
      const tvshow = await db.getTVShowById(req.params.id);
      const episodes = await db.getTVShowEpisodes(req.params.id);
      const credits = await db.getCredits(req.params.id, 'tvshow');
      for (const episode of episodes) {
        episode.servers = await db.getEpisodeServers(episode.id);
      }
      res.render('admin/edit-tvshow', { 
        tvshow, 
        episodes,
        credits,
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
      fs.unlink(posterPath, (err) => {
        if (err && err.code !== 'ENOENT') {
          console.error('Error deleting poster:', err);
        }
      });
    }
    await db.deleteTVShow(req.params.id);
    res.redirect('/admin');
  } catch (err) {
    console.error('Delete TV show error:', err);
    res.redirect('/admin');
  }
});

module.exports = router;