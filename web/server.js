const express = require('express');
const { engine } = require('express-handlebars');
const session = require('express-session');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcrypt');
const multer = require('multer');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'jwt-secret-change-this-in-production';

const app = express();
const PORT = process.env.PORT || 3000;

// Database setup - SQLite for lightweight local storage
const db = new sqlite3.Database(
  process.env.DATABASE_PATH || './database.db',
  (err) => {
    if (err) {
      console.error('Database connection error:', err.message);
      process.exit(1);
    }
    console.log('Connected to SQLite database');
  }
);

// File upload configuration using Multer
// Security: validates file type by both extension and MIME type
const storage = multer.diskStorage({
  destination: './public/uploads/',
  filename: (req, file, cb) => {
    // Generate unique filename: timestamp + random string + original extension
    // e.g., "1702834567890-k7f3x9m2p.jpg"
    const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(2, 11)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit to prevent abuse
  fileFilter: (req, file, cb) => {
    // Security: Only accept image files - checks both extension and MIME type
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only image files are allowed'));
  },
});

// Middleware to load user data and active session for all templates
// This runs on every request, making user/session data available in res.locals
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: process.env.SESSION_SECRET || 'my-secret-key-change-this-later',
    resave: false,
    saveUninitialized: false, // Only create sessions for logged-in users (security)
    cookie: {
      secure: false,
      maxAge: 1000 * 60 * 60 * 2, // 2hours in milliseconds
    },
  })
);

// Load user data and active session for templates
app.use((req, res, next) => {
  if (req.session.userId) {
    db.get(
      'SELECT id, username, email FROM users WHERE id = ?',
      [req.session.userId],
      (err, user) => {
        if (err) {
          console.error('Error fetching user:', err);
          res.locals.user = null;
          res.locals.activeSession = null;
          return next();
        }

        res.locals.user = user;

        // Check for active session (no end_time means still active)
        db.get(
          'SELECT id, gym_name, start_time FROM sessions WHERE user_id = ? AND end_time IS NULL',
          [req.session.userId],
          (err, activeSession) => {
            if (err) {
              console.error('Error fetching active session:', err);
              res.locals.activeSession = null;
            } else {
              res.locals.activeSession = activeSession;
            }
            next();
          }
        );
      }
    );
  } else {
    res.locals.user = null;
    res.locals.activeSession = null;
    next();
  }
});

// Auth middleware - protects routes that require login
// Saves original URL so user can be redirected back after login
const requireAuth = (req, res, next) => {
  if (req.session.userId) {
    next();
  } else {
    req.session.returnTo = req.originalUrl;
    res.redirect('/login');
  }
};

// Handlebars setup with custom helpers
app.engine(
  'handlebars',
  engine({
    defaultLayout: 'main',
    layoutsDir: path.join(__dirname, 'views/layouts'),
    helpers: {
      eq: (a, b) => a === b, // Helper for comparing values in templates (e.g., owner checks)
    },
  })
);

app.set('view engine', 'handlebars');
app.set('views', path.join(__dirname, 'views'));

// Routes

//COMP204 code --start

// API ROUTES (for mobile app)

// Middleware: verifies JWT from Authorization: Bearer <token> header
const requireApiAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    req.userId = decoded.userId;
    next();
  });
};

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    const match = await bcrypt.compare(password, user.password);

    if (match) {
      const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
      res.json({
        message: 'Login successful',
        token,
        user: { id: user.id, username: user.username, email: user.email },
      });
    } else {
      res.status(401).json({ error: 'Invalid password' });
    }
  });
});

app.post('/api/auth/register', async (req, res) => {
  const { email, password, username } = req.body;

  if (!email || !password || !username) {
    return res.status(400).json({ error: 'All fields required' });
  }

  db.get('SELECT * FROM users WHERE email = ?', [email], async (err, existingUser) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    db.run(
      'INSERT INTO users (email, password, username) VALUES (?, ?, ?)',
      [email, hashedPassword, username],
      function (err) {
        if (err) {
          return res.status(500).json({ error: 'Failed to create user' });
        }

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

// Public feed for mobile home screen
app.get('/api/feed', (req, res) => {
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

// Get current user's sessions
app.get('/api/sessions', requireApiAuth, (req, res) => {
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

// Start a new session
app.post('/api/sessions', requireApiAuth, (req, res) => {
  const { gym_name } = req.body;

  if (!gym_name) {
    return res.status(400).json({ error: 'Gym name is required' });
  }

  // Enforce one active session at a time
  db.get(
    'SELECT id FROM sessions WHERE user_id = ? AND end_time IS NULL',
    [req.userId],
    (err, existing) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      if (existing) {
        return res.status(400).json({ error: 'You already have an active session', sessionId: existing.id });
      }

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

// Get session detail with climbs
app.get('/api/sessions/:id', requireApiAuth, (req, res) => {
  const sessionId = req.params.id;

  db.get('SELECT * FROM sessions WHERE id = ? AND user_id = ?', [sessionId, req.userId], (err, session) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (!session) return res.status(404).json({ error: 'Session not found' });

    db.all(
      'SELECT * FROM climbs WHERE session_id = ? ORDER BY created_at ASC',
      [sessionId],
      (err, climbs) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json({ session, climbs });
      }
    );
  });
});

// End a session
app.post('/api/sessions/:id/end', requireApiAuth, (req, res) => {
  const sessionId = req.params.id;
  const { notes } = req.body;

  db.run(
    'UPDATE sessions SET end_time = datetime("now"), notes = ? WHERE id = ? AND user_id = ?',
    [notes || null, sessionId, req.userId],
    function (err) {
      if (err) return res.status(500).json({ error: 'Database error' });
      if (this.changes === 0) return res.status(404).json({ error: 'Session not found' });
      res.json({ message: 'Session ended' });
    }
  );
});

// Add a climb to a session
app.post('/api/sessions/:id/climbs', requireApiAuth, (req, res) => {
  const sessionId = req.params.id;
  const { grade, attempts, topped, zones, description } = req.body;

  if (!grade || !attempts) {
    return res.status(400).json({ error: 'Grade and attempts are required' });
  }

  // Verify session belongs to user and is still active
  db.get(
    'SELECT id FROM sessions WHERE id = ? AND user_id = ? AND end_time IS NULL',
    [sessionId, req.userId],
    (err, session) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      if (!session) return res.status(404).json({ error: 'Active session not found' });

      db.run(
        'INSERT INTO climbs (session_id, grade, attempts, topped, zones, description) VALUES (?, ?, ?, ?, ?, ?)',
        [sessionId, grade, parseInt(attempts), topped ? 1 : 0, zones || 0, description || null],
        function (err) {
          if (err) return res.status(500).json({ error: 'Failed to add climb' });
          res.json({ message: 'Climb added', climbId: this.lastID });
        }
      );
    }
  );
});
// --end

// Homepage - displays public feed of completed sessions
app.get('/', (req, res) => {
  // Query joins sessions with users and aggregates climb images using GROUP_CONCAT
  // Only shows completed sessions (end_time IS NOT NULL)
  db.all(
    `SELECT 
      sessions.id,
      sessions.gym_name,
      sessions.start_time,
      sessions.end_time,
      sessions.notes,
      users.username,
      COUNT(climbs.id) as climb_count,
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
        return res.render('home', {
          title: 'Bouldering Blog',
          sessions: [],
        });
      }

      // Process image_paths: convert "path1|path2|path3" into array
      sessions = sessions.map((session) => {
        if (session.image_paths) {
          // Split by | and filter out nulls, then take first 4
          session.images = session.image_paths
            .split('|')
            .filter((path) => path && path !== 'null')
            .slice(0, 4);
        } else {
          session.images = [];
        }
        return session;
      });

      res.render('home', {
        title: 'Bouldering Blog',
        sessions: sessions,
      });
    }
  );
});

app.get('/login', (req, res) => {
  res.render('login', {
    title: 'Login',
  });
});

app.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.render('login', {
      title: 'Login',
      error: 'Email and Password required',
    });
  }

  db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).send('Error logging in');
    }

    if (!user) {
      return res.render('login', {
        title: 'Login',
        error: 'User doesnt exist',
      });
    }

    const match = await bcrypt.compare(password, user.password);

    if (match) {
      req.session.userId = user.id;
      res.redirect('/');
    } else {
      res.render('login', {
        title: 'Login',
        error: 'password doesnt match',
      });
    }
  });
});

app.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
    }
    res.redirect('/');
  });
});

app.get('/register', (req, res) => {
  res.render('register', {
    title: 'Register',
  });
});

// Registration with password confirmation check
app.post('/register', (req, res) => {
  const { email, password, username, confirm_password } = req.body;

  // Validate passwords match before processing
  if (password !== confirm_password) {
    return res.render('register', {
      title: 'Register',
      error: 'Passwords do not match',
    });
  }

  db.get(
    'SELECT * FROM users WHERE email = ?',
    [email],
    async (err, existingUser) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).send('Error registering');
      }

      if (existingUser) {
        return res.render('register', {
          title: 'Register',
          error: 'User with email exists.',
        });
      }

      // Security: Hash password with bcrypt (10 salt rounds) before storing
      const hashedPassword = await bcrypt.hash(password, 10);

      db.run(
        'INSERT INTO users (email, password, username) VALUES (?, ?, ?)',
        [email, hashedPassword, username],
        function (err) {
          if (err) {
            console.error('Database error:', err);
            return res.status(500).send('Error registering');
          }

          req.session.userId = this.lastID;
          res.redirect('/');
        }
      );
    }
  );
});

app.get('/log-climb', requireAuth, (req, res) => {
  res.render('log-climb', {
    title: 'Log Climb',
  });
});

// Start new session (GET - show form)
app.get('/session/new', requireAuth, (req, res) => {
  // Check if user already has active session
  if (res.locals.activeSession) {
    // Redirect to existing active session instead
    return res.redirect(`/session/${res.locals.activeSession.id}`);
  }

  res.render('new-session', {
    title: 'Start New Session',
  });
});

// Start new session (POST - create it)
app.post('/session/new', requireAuth, (req, res) => {
  const { gym_name } = req.body;

  if (!gym_name) {
    return res.render('new-session', {
      title: 'Start New Session',
      error: 'Gym name is required',
    });
  }

  // Create session with start_time set to now
  db.run(
    'INSERT INTO sessions (user_id, gym_name, start_time) VALUES (?, ?, datetime("now"))',
    [req.session.userId, gym_name],
    function (err) {
      if (err) {
        console.error('Error creating session:', err);
        return res.render('new-session', {
          title: 'Start New Session',
          error: 'Failed to create session',
        });
      }

      // Redirect to the new session's detail page
      res.redirect(`/session/${this.lastID}`);
    }
  );
});

// View single session - publicly viewable but edit controls are owner-only
// Owner check happens in the template using the eq helper
app.get('/session/:id', requireAuth, (req, res) => {
  const sessionId = req.params.id;

  // Get session details
  db.get('SELECT * FROM sessions WHERE id = ?', [sessionId], (err, session) => {
    if (err || !session) {
      return res.status(404).render('error', {
        message: 'Session not found',
        title: 'Error',
      });
    }

    // Get all climbs in this session
    db.all(
      'SELECT * FROM climbs WHERE session_id = ? ORDER BY created_at ASC',
      [sessionId],
      (err, climbs) => {
        if (err) {
          console.error('Error fetching climbs:', err);
          climbs = [];
        }

        res.render('session-detail', {
          title: 'Session Details',
          session: session,
          climbs: climbs,
        });
      }
    );
  });
});

// Add climb - only session owner can add (checked via user_id match)
app.get('/session/:id/add-climb', requireAuth, (req, res) => {
  // Verify session exists AND belongs to logged-in user
  const sessionId = req.params.id;

  // Verify session exists and belongs to user
  db.get(
    'SELECT * FROM sessions WHERE id = ? AND user_id = ?',
    [sessionId, req.session.userId],
    (err, session) => {
      if (err || !session) {
        return res.status(404).render('error', {
          message: 'Session not found',
          title: 'Error',
        });
      }

      // Can't add climbs to ended sessions
      if (session.end_time) {
        return res.redirect(`/session/${sessionId}`);
      }

      res.render('add-climb', {
        title: 'Add Climb',
        session: session,
      });
    }
  );
});

// Add climb to session (POST - save it)
app.post(
  '/session/:id/add-climb',
  requireAuth,
  upload.single('image'),
  (req, res) => {
    const sessionId = req.params.id;
    const { grade, attempts, topped, zones, description } = req.body;

    // Validation
    if (!grade || !attempts) {
      return res.render('add-climb', {
        title: 'Add Climb',
        session: { id: sessionId },
        error: 'Grade and attempts are required',
      });
    }

    // Get image path (if uploaded)
    const imagePath = req.file ? `/uploads/${req.file.filename}` : null;

    // Insert climb
    db.run(
      'INSERT INTO climbs (session_id, grade, attempts, topped, zones, description, image_path) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [
        sessionId,
        grade,
        attempts,
        topped ? 1 : 0, // Convert checkbox to boolean
        zones || 0,
        description || null,
        imagePath,
      ],
      function (err) {
        if (err) {
          console.error('Error adding climb:', err);
          return res.render('add-climb', {
            title: 'Add Climb',
            session: { id: sessionId },
            error: 'Failed to add climb',
          });
        }

        // Redirect back to session detail
        res.redirect(`/session/${sessionId}`);
      }
    );
  }
);

// End session
app.post('/session/:id/end', requireAuth, (req, res) => {
  const sessionId = req.params.id;
  const { notes } = req.body;

  // Update session with end_time and optional notes
  db.run(
    'UPDATE sessions SET end_time = datetime("now"), notes = ? WHERE id = ? AND user_id = ?',
    [notes || null, sessionId, req.session.userId],
    function (err) {
      if (err) {
        console.error('Error ending session:', err);
        return res.status(500).send('Error ending session');
      }

      // Redirect to session detail (now shows as ended)
      res.redirect(`/session/${sessionId}`);
    }
  );
});

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
