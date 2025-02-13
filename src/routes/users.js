const express = require('express');
const router = express.Router();
const db = require('../database');

// Middleware to check if user is logged in
const isAuthenticated = (req, res, next) => {
  if (req.session.user) {
    next();
  } else {
    res.redirect('/auth/login');
  }
};

// User profile
router.get('/profile', isAuthenticated, async (req, res) => {
  try {
    const user = await db.getUserById(req.session.user.id);
    const reviews = await db.getUserReviews(req.session.user.id);
    const favorites = await db.getFavorites(req.session.user.id);
    res.render('users/profile', { user, reviews, favorites });
  } catch (err) {
    res.redirect('/');
  }
});

// Update profile
router.post('/profile', isAuthenticated, async (req, res) => {
  try {
    const { username, email } = req.body;
    await db.updateUser(req.session.user.id, { username, email });
    req.session.user.username = username;
    req.session.user.email = email;
    res.redirect('/user/profile');
  } catch (err) {
    const user = await db.getUserById(req.session.user.id);
    const reviews = await db.getUserReviews(req.session.user.id);
    const favorites = await db.getFavorites(req.session.user.id);
    res.render('users/profile', { 
      user, 
      reviews, 
      favorites, 
      error: 'Failed to update profile' 
    });
  }
});

// Add to favorites
router.post('/favorites/add', isAuthenticated, async (req, res) => {
  try {
    const { contentId, contentType } = req.body;
    await db.addToFavorites(req.session.user.id, contentId, contentType);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add to favorites' });
  }
});

// Remove from favorites
router.post('/favorites/remove', isAuthenticated, async (req, res) => {
  try {
    const { contentId, contentType } = req.body;
    await db.removeFromFavorites(req.session.user.id, contentId, contentType);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to remove from favorites' });
  }
});

module.exports = router;