const express = require('express');
const router = express.Router();
const db = require('../database');

// List all movies
router.get('/', async (req, res) => {
  const movies = await db.getAllMovies();
  res.render('movies/index', { movies });
});

// Show single movie
router.get('/:id', async (req, res) => {
  const movie = await db.getMovieById(req.params.id);
  const servers = await db.getMovieServers(req.params.id);
  const reviews = await db.getMovieReviews(req.params.id);
  res.render('movies/show', { movie, servers, reviews });
});

// Add review
router.post('/:id/review', async (req, res) => {
  if (!req.session.user) {
    return res.redirect('/auth/login');
  }
  
  try {
    const { rating, comment } = req.body;
    await db.addReview(req.session.user.id, req.params.id, 'movie', rating, comment);
    res.redirect(`/movies/${req.params.id}`);
  } catch (err) {
    res.redirect(`/movies/${req.params.id}`);
  }
});

module.exports = router;