const express = require('express');
const router = express.Router();
const db = require('../database');

// List all TV shows
router.get('/', async (req, res) => {
  try {
    const tvshows = await db.getAllTVShows();
    const tvshowIds = tvshows.map(show => show.id);
    const watchCounts = await db.getWatchCounts('tvshow', tvshowIds);
    
    // Add watch counts to tvshow objects
    tvshows.forEach(show => {
      show.watchCount = watchCounts[show.id] || 0;
    });
    
    res.render('tvshows/index', { tvshows });
  } catch (err) {
    console.error('Error fetching TV shows:', err);
    res.render('tvshows/index', { tvshows: [], error: 'Failed to load TV shows' });
  }
});

// Show single TV show
router.get('/:id', async (req, res) => {
  try {
    const tvshow = await db.getTVShowById(req.params.id);
    const episodes = await db.getTVShowEpisodes(req.params.id);
    const reviews = await db.getTVShowReviews(req.params.id);
    const credits = await db.getCredits(req.params.id, 'tvshow');
    const watchCount = await db.getWatchCount(req.params.id, 'tvshow');
    let isFavorite = false;
    let hasReviewed = false;

    if (req.session.user) {
      [isFavorite, hasReviewed] = await Promise.all([
        db.isFavorite(req.session.user.id, req.params.id, 'tvshow'),
        db.hasUserReviewed(req.session.user.id, req.params.id, 'tvshow')
      ]);
    }

    res.render('tvshows/show', { 
      tvshow, 
      episodes, 
      reviews, 
      credits, 
      isFavorite, 
      hasReviewed,
      watchCount
    });
  } catch (err) {
    console.error('TV show details error:', err);
    res.redirect('/tvshows');
  }
});

// Record watch count
router.post('/:id/watch', async (req, res) => {
  try {
    const userId = req.session.user ? req.session.user.id : null;
    const ipAddress = req.ip;
    
    const result = await db.addWatchCount(req.params.id, 'tvshow', userId, ipAddress);
    if (result.updated) {
      const newCount = await db.getWatchCount(req.params.id, 'tvshow');
      res.json({ updated: true, newCount });
    } else {
      res.json({ updated: false });
    }
  } catch (err) {
    console.error('Error recording watch count:', err);
    res.status(500).json({ error: 'Failed to record watch' });
  }
});

// Show single episode
router.get('/:id/episode/:episodeId', async (req, res) => {
  try {
    const episode = await db.getEpisodeById(req.params.episodeId);
    const servers = await db.getEpisodeServers(req.params.episodeId);
    res.render('tvshows/episode', { episode, servers });
  } catch (err) {
    console.error('Episode details error:', err);
    res.redirect(`/tvshows/${req.params.id}`);
  }
});

// Add review
router.post('/:id/review', async (req, res) => {
  if (!req.session.user) {
    return res.redirect('/auth/login');
  }
  
  try {
    const hasReviewed = await db.hasUserReviewed(req.session.user.id, req.params.id, 'tvshow');
    if (hasReviewed) {
      return res.redirect(`/tvshows/${req.params.id}`);
    }

    const { rating, comment } = req.body;
    await db.addReview(req.session.user.id, req.params.id, 'tvshow', rating, comment);
    res.redirect(`/tvshows/${req.params.id}`);
  } catch (err) {
    console.error('Add review error:', err);
    res.redirect(`/tvshows/${req.params.id}`);
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