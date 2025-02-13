const express = require('express');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const path = require('path');
const config = require('../config.json');
const db = require('./database');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const movieRoutes = require('./routes/movies');
const tvshowRoutes = require('./routes/tvshows');
const userRoutes = require('./routes/users');
const apiRoutes = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 3000;

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
        dir: './database'
    }),
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }
}));

// Global variables middleware
app.use((req, res, next) => {
    res.locals.config = config;
    res.locals.user = req.session.user || null;
    next();
});

// Routes
app.use('/auth', authRoutes);
app.use('/admin', adminRoutes);
app.use('/movies', movieRoutes);
app.use('/tvshows', tvshowRoutes);
app.use('/user', userRoutes);
app.use('/api', apiRoutes);

// Home route
app.get('/', async (req, res) => {
    const movies = await db.getLatestMovies();
    const tvshows = await db.getLatestTVShows();
    res.render('home', { movies, tvshows });
});

// Initialize database and start server
db.initDatabase().then(() => {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
});