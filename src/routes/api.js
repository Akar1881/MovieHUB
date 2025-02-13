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

// Get episode servers
router.get('/episodes/:id/servers', async (req, res) => {
    try {
        const servers = await db.getEpisodeServers(req.params.id);
        res.json(servers);
    } catch (err) {
        res.status(500).json({ error: 'Failed to get servers' });
    }
});

module.exports = router;