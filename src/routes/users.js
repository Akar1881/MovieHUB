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
    res.render('users/profile', { user, reviews });
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
    res.render('users/profile', { error: 'Failed to update profile' });
  }
});

module.exports = router;