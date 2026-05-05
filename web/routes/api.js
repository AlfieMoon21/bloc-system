// REST API for the mobile app — written for COMP204 (none of these routes
// existed before). All routes are mounted under /api in server.js.
//
// Public routes: login, register, feed. Protected routes require a JWT
// in Authorization: Bearer <token>, which requireApiAuth validates.
// All responses are JSON; errors always include an "error" key.
//
//   POST /api/auth/login           — returns JWT on valid credentials
//   POST /api/auth/register        — creates user, returns JWT
//   GET  /api/feed                 — public list of completed sessions
//   GET  /api/sessions             — current user's sessions  [auth]
//   POST /api/sessions             — start a new session      [auth]
//   GET  /api/sessions/:id         — single session + climbs  [auth]
//   POST /api/sessions/:id/end     — mark session as ended    [auth]
//   POST /api/sessions/:id/climbs  — add a climb with photo   [auth]

const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { requireApiAuth, JWT_SECRET } = require('../middleware/auth');
const upload = require('../middleware/upload');

// POST /api/auth/login
// Returns a 7-day JWT and the user's public profile.
// Profile is included so the app can display the username without a second request.
router.post('/auth/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (!user) return res.status(401).json({ error: 'User not found' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: 'Invalid password' });

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
    res.json({
      message: 'Login successful',
      token,
      user: { id: user.id, username: user.username, email: user.email },
    });
  });
});

// POST /api/auth/register
// Checks for duplicate email, hashes the password, and returns a JWT
// so the app is logged in immediately without a follow-up login request.
router.post('/auth/register', async (req, res) => {
  const { email, password, username } = req.body;

  if (!email || !password || !username) {
    return res.status(400).json({ error: 'All fields required' });
  }

  db.get('SELECT * FROM users WHERE email = ?', [email], async (err, existing) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (existing) return res.status(400).json({ error: 'Email already registered' });

    // 10 salt rounds is the bcrypt recommended default for interactive logins —
    // high enough to be slow for attackers, fast enough for users not to notice
    const hashedPassword = await bcrypt.hash(password, 10);

    db.run(
      'INSERT INTO users (email, password, username) VALUES (?, ?, ?)',
      [email, hashedPassword, username],
      function (err) {
        if (err) return res.status(500).json({ error: 'Failed to create user' });

        // this.lastID is the auto-incremented primary key of the inserted row
        const token = jwt.sign({ userId: this.lastID }, JWT_SECRET, { expiresIn: '7d' });
        res.json({
          message: 'Registration successful',
          token,
          user: { id: this.lastID, username, email },
        });
      }
    );
  });
});

// GET /api/feed — public, no auth. 20 most recent completed sessions.
// LEFT JOIN climbs keeps zero-climb sessions in results.
router.get('/feed', (req, res) => {
  db.all(
    `SELECT sessions.id, sessions.gym_name, sessions.start_time, sessions.end_time,
      sessions.notes, users.username, COUNT(climbs.id) as climb_count
    FROM sessions
    JOIN users ON sessions.user_id = users.id
    LEFT JOIN climbs ON sessions.id = climbs.session_id
    WHERE sessions.end_time IS NOT NULL
    GROUP BY sessions.id
    ORDER BY sessions.end_time DESC
    LIMIT 20`,
    [],
    (err, sessions) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      res.json(sessions);
    }
  );
});

// GET /api/sessions — current user's sessions, newest first.
// userId comes from the JWT, not the request body, so users can't read each other's data.
router.get('/sessions', requireApiAuth, (req, res) => {
  db.all(
    `SELECT sessions.id, sessions.gym_name, sessions.start_time, sessions.end_time,
      sessions.notes, COUNT(climbs.id) as climb_count
    FROM sessions
    LEFT JOIN climbs ON sessions.id = climbs.session_id
    WHERE sessions.user_id = ?
    GROUP BY sessions.id
    ORDER BY sessions.created_at DESC`,
    [req.userId],
    (err, sessions) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      res.json(sessions);
    }
  );
});

// POST /api/sessions — starts a session.
// Returns the existing session ID on conflict so the app can navigate to it.
router.post('/sessions', requireApiAuth, (req, res) => {
  const { gym_name } = req.body;

  if (!gym_name) return res.status(400).json({ error: 'Gym name is required' });

  db.get(
    'SELECT id FROM sessions WHERE user_id = ? AND end_time IS NULL',
    [req.userId],
    (err, existing) => {
      if (err) return res.status(500).json({ error: 'Database error' });

      if (existing) {
        return res.status(400).json({
          error: 'You already have an active session',
          sessionId: existing.id,
        });
      }

      // datetime("now") sets start_time to the current UTC time in SQLite
      db.run(
        'INSERT INTO sessions (user_id, gym_name, start_time) VALUES (?, ?, datetime("now"))',
        [req.userId, gym_name],
        function (err) {
          if (err) return res.status(500).json({ error: 'Failed to create session' });
          res.json({ message: 'Session started', sessionId: this.lastID });
        }
      );
    }
  );
});

// GET /api/sessions/:id — session + climbs.
// Returns 404 (not 403) for another user's session to avoid leaking that it exists.
router.get('/sessions/:id', requireApiAuth, (req, res) => {
  db.get(
    'SELECT * FROM sessions WHERE id = ? AND user_id = ?',
    [req.params.id, req.userId],
    (err, session) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      if (!session) return res.status(404).json({ error: 'Session not found' });

      db.all(
        'SELECT * FROM climbs WHERE session_id = ? ORDER BY created_at ASC',
        [req.params.id],
        (err, climbs) => {
          if (err) return res.status(500).json({ error: 'Database error' });
          res.json({ session, climbs });
        }
      );
    }
  );
});

// POST /api/sessions/:id/end — sets end_time.
// AND user_id = ? blocks ending other users' sessions.
// this.changes === 0 means wrong ID or wrong user — both return 404.
router.post('/sessions/:id/end', requireApiAuth, (req, res) => {
  const { notes } = req.body;

  db.run(
    'UPDATE sessions SET end_time = datetime("now"), notes = ? WHERE id = ? AND user_id = ?',
    [notes || null, req.params.id, req.userId],
    function (err) {
      if (err) return res.status(500).json({ error: 'Database error' });
      if (this.changes === 0) return res.status(404).json({ error: 'Session not found' });
      res.json({ message: 'Session ended' });
    }
  );
});

// POST /api/sessions/:id/climbs — adds a climb with optional photo.
// upload.single('image') runs multer first; req.file is undefined if no image sent.
// Verifies the session is active and owned by this user before inserting.
router.post('/sessions/:id/climbs', requireApiAuth, upload.single('image'), (req, res) => {
  const sessionId = req.params.id;
  const { grade, attempts, topped, zones, description } = req.body;

  if (!grade || !attempts) {
    return res.status(400).json({ error: 'Grade and attempts are required' });
  }

  // relative URL so the mobile app can prepend API_URL to display the image
  const imagePath = req.file ? `/uploads/${req.file.filename}` : null;

  db.get(
    'SELECT id FROM sessions WHERE id = ? AND user_id = ? AND end_time IS NULL',
    [sessionId, req.userId],
    (err, session) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      if (!session) return res.status(404).json({ error: 'Active session not found' });

      db.run(
        `INSERT INTO climbs
          (session_id, grade, attempts, topped, zones, description, image_path)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          sessionId,
          grade,
          parseInt(attempts),  // body values arrive as strings — coerce to integer
          topped ? 1 : 0,      // SQLite has no boolean type — store as 0/1
          zones || 0,
          description || null,
          imagePath,
        ],
        function (err) {
          if (err) return res.status(500).json({ error: 'Failed to add climb' });
          res.json({ message: 'Climb added', climbId: this.lastID });
        }
      );
    }
  );
});

module.exports = router;
