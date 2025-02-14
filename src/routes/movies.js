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
  try {
    const movie = await db.getMovieById(req.params.id);
    const servers = await db.getMovieServers(req.params.id);
    const reviews = await db.getMovieReviews(req.params.id);
    const credits = await db.getCredits(req.params.id, 'movie');
    let isFavorite = false;
    let hasReviewed = false;

    if (req.session.user) {
      [isFavorite, hasReviewed] = await Promise.all([
        db.isFavorite(req.session.user.id, req.params.id, 'movie'),
        db.hasUserReviewed(req.session.user.id, req.params.id, 'movie')
      ]);
    }

    res.render('movies/show', { movie, servers, reviews, credits, isFavorite, hasReviewed });
  } catch (err) {
    console.error('Movie details error:', err);
    res.redirect('/movies');
  }
});

// Add review
router.post('/:id/review', async (req, res) => {
  if (!req.session.user) {
    return res.redirect('/auth/login');
  }
  
  try {
    const hasReviewed = await db.hasUserReviewed(req.session.user.id, req.params.id, 'movie');
    if (hasReviewed) {
      return res.redirect(`/movies/${req.params.id}`);
    }

    const { rating, comment } = req.body;
    await db.addReview(req.session.user.id, req.params.id, 'movie', rating, comment);
    res.redirect(`/movies/${req.params.id}`);
  } catch (err) {
    console.error('Add review error:', err);
    res.redirect(`/movies/${req.params.id}`);
  }
});

// Delete review (admin only)
router.post('/:id/review/:reviewId/delete', async (req, res) => {
  if (!req.session.user?.is_admin) {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  
  try {
    await db.deleteReview(req.params.reviewId);
    res.json({ success: true });
  } catch (err) {
    console.error('Delete review error:', err);
    res.status(500).json({ error: 'Failed to delete review' });
  }
});

module.exports = router;