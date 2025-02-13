const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../database');

// Middleware to check if user is logged in
const isAuthenticated = (req, res, next) => {
  if (req.session.user) {
    next();
  } else {
    res.redirect('/auth/login');
  }
};

// Login page
router.get('/login', (req, res) => {
  res.render('auth/login');
});

// Register page
router.get('/register', (req, res) => {
  res.render('auth/register');
});

// Login process
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  
  try {
    const user = await db.getUserByEmail(email);
    if (user && await bcrypt.compare(password, user.password)) {
      req.session.user = {
        id: user.id,
        username: user.username,
        email: user.email,
        is_admin: user.is_admin
      };
      res.redirect('/');
    } else {
      res.render('auth/login', { error: 'Invalid credentials' });
    }
  } catch (err) {
    res.render('auth/login', { error: 'An error occurred' });
  }
});

// Register process
router.post('/register', async (req, res) => {
  const { username, email, password } = req.body;
  
  try {
    await db.createUser(username, email, password);
    res.redirect('/auth/login');
  } catch (err) {
    res.render('auth/register', { error: 'Registration failed' });
  }
});

// Logout
router.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

module.exports = router;