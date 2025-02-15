const express = require('express');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const path = require('path');
const fs = require('fs');
const config = require('../config.json');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

// Ensure database directory exists
const dbDir = path.join(__dirname, '../database');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Middleware
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session setup
app.use(session({
    store: new SQLiteStore({
        db: 'sessions.db',
        dir: './database',
        concurrentDB: true
    }),
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }
}));

// Format count helper function
app.locals.formatCount = (count) => {
    if (count >= 1000000) {
        return (count / 1000000).toFixed(1) + 'M';
    } else if (count >= 1000) {
        return (count / 1000).toFixed(1) + 'K';
    }
    return count.toString();
};

// Global variables middleware
app.use((req, res, next) => {
    res.locals.config = config;
    res.locals.user = req.session.user || null;
    next();
});

// Routes
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const movieRoutes = require('./routes/movies');
const tvshowRoutes = require('./routes/tvshows');
const userRoutes = require('./routes/users');
const apiRoutes = require('./routes/api');

app.use('/auth', authRoutes);
app.use('/admin', adminRoutes);
app.use('/movies', movieRoutes);
app.use('/tvshows', tvshowRoutes);
app.use('/user', userRoutes);
app.use('/api', apiRoutes);

// Home route
app.get('/', async (req, res) => {
    try {
        const movies = await db.getLatestMovies();
        const tvshows = await db.getLatestTVShows();
        res.render('home', { movies, tvshows });
    } catch (err) {
        console.error('Home page error:', err);
        res.render('home', { movies: [], tvshows: [], error: 'Failed to load content' });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Application error:', err);
    res.status(500).render('error', { 
        message: 'An error occurred',
        error: process.env.NODE_ENV === 'development' ? err : {}
    });
});

// Initialize database and start server
const initServer = async () => {
    try {
        await db.initDatabase();
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    } catch (err) {
        console.error('Failed to initialize database:', err);
        process.exit(1);
    }
};

// Handle graceful shutdown
process.on('SIGINT', async () => {
    console.log('Shutting down gracefully...');
    process.exit(0);
});

initServer();