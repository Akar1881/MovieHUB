const express = require('express');
const router = express.Router();
const db = require('../database');

// List all TV shows
router.get('/', async (req, res) => {
  const tvshows = await db.getAllTVShows();
  res.render('tvshows/index', { tvshows });
});

// Show single TV show
router.get('/:id', async (req, res) => {
  const tvshow = await db.getTVShowById(req.params.id);
  const episodes = await db.getTVShowEpisodes(req.params.id);
  const reviews = await db.getTVShowReviews(req.params.id);
  res.render('tvshows/show', { tvshow, episodes, reviews });
});

// Show single episode
router.get('/:id/episode/:episodeId', async (req, res) => {
  const episode = await db.getEpisodeById(req.params.episodeId);
  const servers = await db.getEpisodeServers(req.params.episodeId);
  res.render('tvshows/episode', { episode, servers });
});

// Add review
router.post('/:id/review', async (req, res) => {
  if (!req.session.user) {
    return res.redirect('/auth/login');
  }
  
  try {
    const { rating, comment } = req.body;
    await db.addReview(req.session.user.id, req.params.id, 'tvshow', rating, comment);
    res.redirect(`/tvshows/${req.params.id}`);
  } catch (err) {
    res.redirect(`/tvshows/${req.params.id}`);
  }
});

module.exports = router;