const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const config = require('../config.json');
const path = require('path');
const fs = require('fs');

// Ensure database directory exists
const dbDir = path.join(__dirname, '../database');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'public/uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'movies.db');
const db = new sqlite3.Database(dbPath);

const db_ops = {
  initDatabase: () => {
    return new Promise((resolve, reject) => {
      db.serialize(() => {
        // Users table
        db.run(`CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE NOT NULL,
          email TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          is_admin INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Movies table
        db.run(`CREATE TABLE IF NOT EXISTS movies (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          type TEXT NOT NULL,
          poster TEXT NOT NULL,
          description TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Movie servers table
        db.run(`CREATE TABLE IF NOT EXISTS movie_servers (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          movie_id INTEGER,
          server_name TEXT NOT NULL,
          embed_url TEXT NOT NULL,
          FOREIGN KEY(movie_id) REFERENCES movies(id) ON DELETE CASCADE
        )`);

        // TV Shows table
        db.run(`CREATE TABLE IF NOT EXISTS tvshows (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          poster TEXT NOT NULL,
          description TEXT,
          seasons INTEGER NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // TV Show episodes table
        db.run(`CREATE TABLE IF NOT EXISTS tvshow_episodes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          tvshow_id INTEGER,
          season INTEGER NOT NULL,
          episode INTEGER NOT NULL,
          FOREIGN KEY(tvshow_id) REFERENCES tvshows(id) ON DELETE CASCADE
        )`);

        // Episode servers table
        db.run(`CREATE TABLE IF NOT EXISTS episode_servers (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          episode_id INTEGER,
          server_name TEXT NOT NULL,
          embed_url TEXT NOT NULL,
          FOREIGN KEY(episode_id) REFERENCES tvshow_episodes(id) ON DELETE CASCADE
        )`);

        // Reviews table
        db.run(`CREATE TABLE IF NOT EXISTS reviews (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER,
          content_id INTEGER,
          content_type TEXT NOT NULL,
          rating INTEGER NOT NULL,
          comment TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
        )`);

        // Create admin account if it doesn't exist
        const { email, password, username } = config.admin;
        db.get('SELECT id FROM users WHERE email = ?', [email], (err, row) => {
          if (!row) {
            bcrypt.hash(password, 10, (err, hash) => {
              db.run('INSERT INTO users (username, email, password, is_admin) VALUES (?, ?, ?, 1)',
                [username, email, hash]);
            });
          }
        });

        resolve();
      });
    });
  },

  // User operations
  createUser: (username, email, password) => {
    return new Promise((resolve, reject) => {
      bcrypt.hash(password, 10, (err, hash) => {
        if (err) reject(err);
        db.run('INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
          [username, email, hash], (err) => {
            if (err) reject(err);
            resolve();
          });
      });
    });
  },

  getUserById: (id) => {
    return new Promise((resolve, reject) => {
      db.get('SELECT id, username, email, is_admin FROM users WHERE id = ?', [id], (err, row) => {
        if (err) reject(err);
        resolve(row);
      });
    });
  },

  getUserByEmail: (email) => {
    return new Promise((resolve, reject) => {
      db.get('SELECT * FROM users WHERE email = ?', [email], (err, row) => {
        if (err) reject(err);
        resolve(row);
      });
    });
  },

  updateUser: (id, data) => {
    return new Promise((resolve, reject) => {
      db.run('UPDATE users SET username = ?, email = ? WHERE id = ?',
        [data.username, data.email, id], (err) => {
          if (err) reject(err);
          resolve();
        });
    });
  },

  // Movie operations
  addMovie: (title, type, poster, description) => {
    return new Promise((resolve, reject) => {
      db.run('INSERT INTO movies (title, type, poster, description) VALUES (?, ?, ?, ?)',
        [title, type, poster, description], function(err) {
          if (err) reject(err);
          resolve(this.lastID);
        });
    });
  },

  updateMovie: (id, data) => {
    return new Promise((resolve, reject) => {
      const { title, type, description, poster } = data;
      const updates = [];
      const values = [];
      
      if (title) {
        updates.push('title = ?');
        values.push(title);
      }
      if (type) {
        updates.push('type = ?');
        values.push(type);
      }
      if (description) {
        updates.push('description = ?');
        values.push(description);
      }
      if (poster) {
        updates.push('poster = ?');
        values.push(poster);
      }
      
      values.push(id);
      
      db.run(`UPDATE movies SET ${updates.join(', ')} WHERE id = ?`, values, (err) => {
        if (err) reject(err);
        resolve();
      });
    });
  },

  deleteMovie: (id) => {
    return new Promise((resolve, reject) => {
      db.run('DELETE FROM movies WHERE id = ?', [id], (err) => {
        if (err) reject(err);
        resolve();
      });
    });
  },

  // Movie servers
  addMovieServer: (movieId, serverName, embedUrl) => {
    return new Promise((resolve, reject) => {
      db.run('INSERT INTO movie_servers (movie_id, server_name, embed_url) VALUES (?, ?, ?)',
        [movieId, serverName, embedUrl], (err) => {
          if (err) reject(err);
          resolve();
        });
    });
  },

  deleteMovieServers: (movieId) => {
    return new Promise((resolve, reject) => {
      db.run('DELETE FROM movie_servers WHERE movie_id = ?', [movieId], (err) => {
        if (err) reject(err);
        resolve();
      });
    });
  },

  // TV Show operations
  addTVShow: (title, poster, description, seasons) => {
    return new Promise((resolve, reject) => {
      db.run('INSERT INTO tvshows (title, poster, description, seasons) VALUES (?, ?, ?, ?)',
        [title, poster, description, seasons], function(err) {
          if (err) reject(err);
          resolve(this.lastID);
        });
    });
  },

  updateTVShow: (id, data) => {
    return new Promise((resolve, reject) => {
      const { title, description, seasons, poster } = data;
      const updates = [];
      const values = [];
      
      if (title) {
        updates.push('title = ?');
        values.push(title);
      }
      if (description) {
        updates.push('description = ?');
        values.push(description);
      }
      if (seasons) {
        updates.push('seasons = ?');
        values.push(seasons);
      }
      if (poster) {
        updates.push('poster = ?');
        values.push(poster);
      }
      
      values.push(id);
      
      db.run(`UPDATE tvshows SET ${updates.join(', ')} WHERE id = ?`, values, (err) => {
        if (err) reject(err);
        resolve();
      });
    });
  },

  deleteTVShow: (id) => {
    return new Promise((resolve, reject) => {
      db.run('DELETE FROM tvshows WHERE id = ?', [id], (err) => {
        if (err) reject(err);
        resolve();
      });
    });
  },

  // Episode operations
  addTVShowEpisode: (tvshowId, season, episode) => {
    return new Promise((resolve, reject) => {
      db.run('INSERT INTO tvshow_episodes (tvshow_id, season, episode) VALUES (?, ?, ?)',
        [tvshowId, season, episode], function(err) {
          if (err) reject(err);
          resolve(this.lastID);
        });
    });
  },

  updateTVShowEpisode: (id, season, episode) => {
    return new Promise((resolve, reject) => {
      db.run('UPDATE tvshow_episodes SET season = ?, episode = ? WHERE id = ?',
        [season, episode, id], (err) => {
          if (err) reject(err);
          resolve();
        });
    });
  },

  // Episode servers
  addEpisodeServer: (episodeId, serverName, embedUrl) => {
    return new Promise((resolve, reject) => {
      db.run('INSERT INTO episode_servers (episode_id, server_name, embed_url) VALUES (?, ?, ?)',
        [episodeId, serverName, embedUrl], (err) => {
          if (err) reject(err);
          resolve();
        });
    });
  },

  deleteEpisodeServers: (episodeId) => {
    return new Promise((resolve, reject) => {
      db.run('DELETE FROM episode_servers WHERE episode_id = ?', [episodeId], (err) => {
        if (err) reject(err);
        resolve();
      });
    });
  },

  // Get content
  getLatestMovies: () => {
    return new Promise((resolve, reject) => {
      db.all(`
        SELECT m.*, 
          COALESCE(AVG(r.rating), 0) as avgRating,
          COUNT(r.id) as reviewCount
        FROM movies m
        LEFT JOIN reviews r ON r.content_id = m.id AND r.content_type = 'movie'
        GROUP BY m.id
        ORDER BY m.created_at DESC LIMIT 12
      `, [], (err, rows) => {
        if (err) reject(err);
        resolve(rows);
      });
    });
  },

  getLatestTVShows: () => {
    return new Promise((resolve, reject) => {
      db.all(`
        SELECT t.*, 
          COALESCE(AVG(r.rating), 0) as avgRating,
          COUNT(r.id) as reviewCount
        FROM tvshows t
        LEFT JOIN reviews r ON r.content_id = t.id AND r.content_type = 'tvshow'
        GROUP BY t.id
        ORDER BY t.created_at DESC LIMIT 12
      `, [], (err, rows) => {
        if (err) reject(err);
        resolve(rows);
      });
    });
  },

  getAllMovies: () => {
    return new Promise((resolve, reject) => {
      db.all(`
        SELECT m.*, 
          COALESCE(AVG(r.rating), 0) as avgRating,
          COUNT(r.id) as reviewCount
        FROM movies m
        LEFT JOIN reviews r ON r.content_id = m.id AND r.content_type = 'movie'
        GROUP BY m.id
        ORDER BY m.created_at DESC
      `, [], (err, rows) => {
        if (err) reject(err);
        resolve(rows);
      });
    });
  },

  getAllTVShows: () => {
    return new Promise((resolve, reject) => {
      db.all(`
        SELECT t.*, 
          COALESCE(AVG(r.rating), 0) as avgRating,
          COUNT(r.id) as reviewCount
        FROM tvshows t
        LEFT JOIN reviews r ON r.content_id = t.id AND r.content_type = 'tvshow'
        GROUP BY t.id
        ORDER BY t.created_at DESC
      `, [], (err, rows) => {
        if (err) reject(err);
        resolve(rows);
      });
    });
  },

  getMovieById: (id) => {
    return new Promise((resolve, reject) => {
      db.get(`
        SELECT m.*, 
          COALESCE(AVG(r.rating), 0) as avgRating,
          COUNT(r.id) as reviewCount
        FROM movies m
        LEFT JOIN reviews r ON r.content_id = m.id AND r.content_type = 'movie'
        WHERE m.id = ?
        GROUP BY m.id
      `, [id], (err, row) => {
        if (err) reject(err);
        resolve(row);
      });
    });
  },

  getTVShowById: (id) => {
    return new Promise((resolve, reject) => {
      db.get(`
        SELECT t.*, 
          COALESCE(AVG(r.rating), 0) as avgRating,
          COUNT(r.id) as reviewCount
        FROM tvshows t
        LEFT JOIN reviews r ON r.content_id = t.id AND r.content_type = 'tvshow'
        WHERE t.id = ?
        GROUP BY t.id
      `, [id], (err, row) => {
        if (err) reject(err);
        resolve(row);
      });
    });
  },

  getTVShowEpisodes: (tvshowId) => {
    return new Promise((resolve, reject) => {
      db.all('SELECT * FROM tvshow_episodes WHERE tvshow_id = ? ORDER BY season, episode', [tvshowId], (err, rows) => {
        if (err) reject(err);
        resolve(rows);
      });
    });
  },

  getMovieServers: (movieId) => {
    return new Promise((resolve, reject) => {
      db.all('SELECT * FROM movie_servers WHERE movie_id = ?', [movieId], (err, rows) => {
        if (err) reject(err);
        resolve(rows);
      });
    });
  },

  getEpisodeServers: (episodeId) => {
    return new Promise((resolve, reject) => {
      db.all('SELECT * FROM episode_servers WHERE episode_id = ?', [episodeId], (err, rows) => {
        if (err) reject(err);
        resolve(rows);
      });
    });
  },

  // Reviews
  addReview: (userId, contentId, contentType, rating, comment) => {
    return new Promise((resolve, reject) => {
      db.run('INSERT INTO reviews (user_id, content_id, content_type, rating, comment) VALUES (?, ?, ?, ?, ?)',
        [userId, contentId, contentType, rating, comment], (err) => {
          if (err) reject(err);
          resolve();
        });
    });
  },

  getMovieReviews: (movieId) => {
    return new Promise((resolve, reject) => {
      db.all(`
        SELECT r.*, u.username 
        FROM reviews r 
        JOIN users u ON r.user_id = u.id 
        WHERE r.content_type = 'movie' AND r.content_id = ?
        ORDER BY r.created_at DESC
      `, [movieId], (err, rows) => {
        if (err) reject(err);
        resolve(rows);
      });
    });
  },

  getTVShowReviews: (tvshowId) => {
    return new Promise((resolve, reject) => {
      db.all(`
        SELECT r.*, u.username 
        FROM reviews r 
        JOIN users u ON r.user_id = u.id 
        WHERE r.content_type = 'tvshow' AND r.content_id = ?
        ORDER BY r.created_at DESC
      `, [tvshowId], (err, rows) => {
        if (err) reject(err);
        resolve(rows);
      });
    });
  },

  getUserReviews: (userId) => {
    return new Promise((resolve, reject) => {
      db.all(`
        SELECT r.*, 
          CASE 
            WHEN r.content_type = 'movie' THEN m.title 
            ELSE t.title 
          END as title
        FROM reviews r
        LEFT JOIN movies m ON r.content_type = 'movie' AND r.content_id = m.id
        LEFT JOIN tvshows t ON r.content_type = 'tvshow' AND r.content_id = t.id
        WHERE r.user_id = ?
        ORDER BY r.created_at DESC
      `, [userId], (err, rows) => {
        if (err) reject(err);
        resolve(rows);
      });
    });
  },

  // Search
  searchMovies: (query) => {
    return new Promise((resolve, reject) => {
      const searchTerm = `%${query}%`;
      db.all(`
        SELECT m.*, 
          COALESCE(AVG(r.rating), 0) as avgRating,
          COUNT(r.id) as reviewCount
        FROM movies m
        LEFT JOIN reviews r ON r.content_id = m.id AND r.content_type = 'movie'
        WHERE m.title LIKE ?
        GROUP BY m.id
        ORDER BY m.title ASC
      `, [searchTerm], (err, rows) => {
        if (err) reject(err);
        resolve(rows);
      });
    });
  },

  searchTVShows: (query) => {
    return new Promise((resolve, reject) => {
      const searchTerm = `%${query}%`;
      db.all(`
        SELECT t.*, 
          COALESCE(AVG(r.rating), 0) as avgRating,
          COUNT(r.id) as reviewCount
        FROM tvshows t
        LEFT JOIN reviews r ON r.content_id = t.id AND r.content_type = 'tvshow'
        WHERE t.title LIKE ?
        GROUP BY t.id
        ORDER BY t.title ASC
      `, [searchTerm], (err, rows) => {
        if (err) reject(err);
        resolve(rows);
      });
    });
  }
};

module.exports = db_ops;