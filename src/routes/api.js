const express = require('express');
const router = express.Router();
const db = require('../database');

// Search endpoint
router.get('/search', async (req, res) => {
    const query = req.query.q;
    if (!query || query.length < 2) {
        return res.json({ movies: [], tvshows: [] });
    }

    try {
        const [movies, tvshows] = await Promise.all([
            db.searchMovies(query),
            db.searchTVShows(query)
        ]);

        res.json({ movies, tvshows });
    } catch (err) {
        res.status(500).json({ error: 'Search failed' });
    }
});

module.exports = router;