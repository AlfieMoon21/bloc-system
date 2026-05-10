// Server-rendered HTML routes (refactored from a single server.js for COMP204).
// res.locals.user and res.locals.activeSession come from middleware/locals.js
// and are available in every template without per-route fetching.
//
//   GET  /                        — public feed
//   GET  /login                   — login form
//   POST /login                   — validate credentials, set session
//   GET  /logout                  — destroy session
//   GET  /register                — registration form
//   POST /register                — create account
//   GET  /log-climb               — legacy redirect shim
//   GET  /session/new             — new session form
//   POST /session/new             — create session
//   GET  /session/:id             — session detail page
//   GET  /session/:id/add-climb   — add-climb form
//   POST /session/:id/add-climb   — save climb
//   POST /session/:id/end         — end session

const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const upload = require('../middleware/upload');

// GET / — public feed. GROUP_CONCAT collects image paths as a pipe-separated
// string (split into an array below) to avoid N+1 queries.
router.get('/', (req, res) => {
  db.all(
    `SELECT sessions.id, sessions.gym_name, sessions.start_time, sessions.end_time,
      sessions.notes, users.username, COUNT(climbs.id) as climb_count,
      GROUP_CONCAT(climbs.image_path, '|') as image_paths
    FROM sessions
    JOIN users ON sessions.user_id = users.id
    LEFT JOIN climbs ON sessions.id = climbs.session_id
    WHERE sessions.end_time IS NOT NULL
    GROUP BY sessions.id
    ORDER BY sessions.end_time DESC
    LIMIT 20`,
    [],
    (err, sessions) => {
      if (err) {
        console.error('Error fetching sessions:', err);
        // Render with an empty list rather than showing a crash page
        return res.render('home', { title: 'Bouldering Blog', sessions: [] });
      }

      // split the pipe-separated string and cap at 4 for the thumbnail grid
      sessions = sessions.map((session) => {
        session.images = session.image_paths
          ? session.image_paths.split('|').filter((p) => p && p !== 'null').slice(0, 4)
          : [];
        return session;
      });

      res.render('home', { title: 'Bouldering Blog', sessions });
    }
  );
});

router.get('/login', (req, res) => res.render('login', { title: 'Login' }));

router.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.render('login', { title: 'Login', error: 'Email and Password required' });
  }

  db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
    if (err) return res.status(500).send('Error logging in');
    if (!user) return res.render('login', { title: 'Login', error: 'User doesnt exist' });

    const match = await bcrypt.compare(password, user.password);

    if (match) {
      req.session.userId = user.id;
      res.redirect('/');
    } else {
      res.render('login', { title: 'Login', error: 'password doesnt match' });
    }
  });
});

// Destroys the server-side session. The cookie the browser holds becomes invalid
// and any subsequent request is treated as a guest.
router.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/'));
});

router.get('/register', (req, res) => res.render('register', { title: 'Register' }));

router.post('/register', async (req, res) => {
  const { email, password, username, confirm_password } = req.body;

  // Client-side check repeated server-side — never trust browser-only validation
  if (password !== confirm_password) {
    return res.render('register', { title: 'Register', error: 'Passwords do not match' });
  }

  db.get('SELECT * FROM users WHERE email = ?', [email], async (err, existing) => {
    if (err) return res.status(500).send('Error registering');
    if (existing) return res.render('register', { title: 'Register', error: 'User with email exists.' });

    // 10 salt rounds — slow enough for attackers, imperceptible for users
    const hashedPassword = await bcrypt.hash(password, 10);

    db.run(
      'INSERT INTO users (email, password, username) VALUES (?, ?, ?)',
      [email, hashedPassword, username],
      function (err) {
        if (err) return res.status(500).send('Error registering');
        req.session.userId = this.lastID; // log the user in immediately after registering
        res.redirect('/');
      }
    );
  });
});

// Legacy route kept so existing bookmarks and links don't break.
router.get('/log-climb', requireAuth, (req, res) => res.render('log-climb', { title: 'Log Climb' }));

// Redirects to the active session if one exists — same guard as POST /api/sessions.
router.get('/session/new', requireAuth, (req, res) => {
  // res.locals.activeSession is set by middleware/locals.js on every request
  if (res.locals.activeSession) {
    return res.redirect(`/session/${res.locals.activeSession.id}`);
  }
  res.render('new-session', { title: 'Start New Session' });
});

router.post('/session/new', requireAuth, (req, res) => {
  const { gym_name } = req.body;

  if (!gym_name) {
    return res.render('new-session', { title: 'Start New Session', error: 'Gym name is required' });
  }

  db.run(
    'INSERT INTO sessions (user_id, gym_name, start_time) VALUES (?, ?, datetime("now"))',
    [req.session.userId, gym_name],
    function (err) {
      if (err) return res.render('new-session', { title: 'Start New Session', error: 'Failed to create session' });
      res.redirect(`/session/${this.lastID}`);
    }
  );
});

// Any logged-in user can view; the template uses eq to show edit/end controls only to the owner.
router.get('/session/:id', requireAuth, (req, res) => {
  db.get('SELECT * FROM sessions WHERE id = ?', [req.params.id], (err, session) => {
    if (err || !session) {
      return res.status(404).render('error', { message: 'Session not found', title: 'Error' });
    }

    db.all(
      'SELECT * FROM climbs WHERE session_id = ? ORDER BY created_at ASC',
      [req.params.id],
      (err, climbs) => {
        res.render('session-detail', {
          title: 'Session Details',
          session,
          climbs: err ? [] : climbs, // degrade to empty list on error
        });
      }
    );
  });
});

// Both routes verify the session exists, belongs to this user, and hasn't ended.
// Ended sessions redirect to the detail page.
router.get('/session/:id/add-climb', requireAuth, (req, res) => {
  db.get(
    'SELECT * FROM sessions WHERE id = ? AND user_id = ?',
    [req.params.id, req.session.userId],
    (err, session) => {
      if (err || !session) {
        return res.status(404).render('error', { message: 'Session not found', title: 'Error' });
      }
      // Silently redirect rather than showing an error — the session simply ended
      if (session.end_time) return res.redirect(`/session/${req.params.id}`);
      res.render('add-climb', { title: 'Add Climb', session });
    }
  );
});

router.post('/session/:id/add-climb', requireAuth, upload.single('image'), (req, res) => {
  const sessionId = req.params.id;
  const { grade, attempts, topped, zones, description } = req.body;

  if (!grade || !attempts) {
    return res.render('add-climb', {
      title: 'Add Climb',
      session: { id: sessionId },
      error: 'Grade and attempts are required',
    });
  }

  // relative URL served by Express static middleware at /uploads/<filename>
  const imagePath = req.file ? `/uploads/${req.file.filename}` : null;

  db.run(
    `INSERT INTO climbs
      (session_id, grade, attempts, topped, zones, description, image_path)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      sessionId,
      grade,
      attempts,
      topped ? 1 : 0, // checkbox is "on" or undefined — convert to SQLite boolean
      zones || 0,
      description || null,
      imagePath,
    ],
    function (err) {
      if (err) {
        return res.render('add-climb', {
          title: 'Add Climb',
          session: { id: sessionId },
          error: 'Failed to add climb',
        });
      }
      res.redirect(`/session/${sessionId}`);
    }
  );
});

// Sets end_time. AND user_id = ? means only the owner can end their session.
router.post('/session/:id/end', requireAuth, (req, res) => {
  const { notes } = req.body;

  db.run(
    'UPDATE sessions SET end_time = datetime("now"), notes = ? WHERE id = ? AND user_id = ?',
    [notes || null, req.params.id, req.session.userId],
    function (err) {
      if (err) return res.status(500).send('Error ending session');
      res.redirect(`/session/${req.params.id}`);
    }
  );
});

// GET /comp204 — publicly accessible project overview page
router.get('/comp204', (req, res) => {
  res.render('comp204', { title: 'COMP204 — Distributed Systems' });
});

// POST /session/:id/climbs/:climbId/delete — web-form-compatible delete.
// HTML forms can't send DELETE; this POST route does the same thing.
// Only the session owner can delete from an active session.
router.post('/session/:id/climbs/:climbId/delete', requireAuth, (req, res) => {
  db.run(
    `DELETE FROM climbs
     WHERE id = ? AND session_id = ?
       AND EXISTS (
         SELECT 1 FROM sessions
         WHERE id = ? AND user_id = ? AND end_time IS NULL
       )`,
    [req.params.climbId, req.params.id, req.params.id, req.session.userId],
    function (err) {
      if (err) return res.status(500).send('Error deleting climb');
      res.redirect(`/session/${req.params.id}`);
    }
  );
});

// GET /profile — current user's stats page.
// Runs three aggregate queries in series then renders the profile template.
router.get('/profile', requireAuth, (req, res) => {
  const uid = req.session.userId;

  db.get(
    `SELECT
      COUNT(DISTINCT s.id)                                           AS total_sessions,
      COUNT(c.id)                                                    AS total_climbs,
      COALESCE(SUM(CASE WHEN c.topped = 1 THEN 1 ELSE 0 END), 0)   AS topped_count,
      ROUND(AVG(c.attempts), 1)                                      AS avg_attempts
    FROM sessions s
    LEFT JOIN climbs c ON c.session_id = s.id
    WHERE s.user_id = ?`,
    [uid],
    (err, summary) => {
      if (err) return res.status(500).render('error', { message: 'Database error', title: 'Error' });

      db.all(
        `SELECT grade, COUNT(*) AS count, SUM(topped) AS topped_count
         FROM climbs
         JOIN sessions ON climbs.session_id = sessions.id
         WHERE sessions.user_id = ?
         GROUP BY grade
         ORDER BY count DESC
         LIMIT 15`,
        [uid],
        (err, grades) => {
          if (err) return res.status(500).render('error', { message: 'Database error', title: 'Error' });

          db.get(
            `SELECT gym_name, COUNT(*) AS count
             FROM sessions WHERE user_id = ?
             GROUP BY gym_name ORDER BY count DESC LIMIT 1`,
            [uid],
            (err, topGym) => {
              if (err) return res.status(500).render('error', { message: 'Database error', title: 'Error' });

              const total_climbs  = summary.total_climbs  || 0;
              const topped_count  = summary.topped_count  || 0;
              const maxCount      = grades.length > 0 ? grades[0].count : 1;

              const gradesWithBar = grades.map((g) => ({
                ...g,
                bar_width:   Math.round((g.count / maxCount) * 100),
                topped_pct:  g.count > 0 ? Math.round((g.topped_count / g.count) * 100) : 0,
              }));

              res.render('profile', {
                title: 'My Profile',
                stats: {
                  total_sessions: summary.total_sessions || 0,
                  total_climbs,
                  topped_count,
                  topped_pct: total_climbs > 0 ? Math.round((topped_count / total_climbs) * 100) : 0,
                  avg_attempts: summary.avg_attempts || 0,
                  top_gym: topGym ? topGym.gym_name : null,
                },
                grades: gradesWithBar,
              });
            }
          );
        }
      );
    }
  );
});

module.exports = router;
