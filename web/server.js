// Entry point — sets up middleware, view engine, and routes. No route logic here.
// The modular layout, /api mount, and cors() call were added for COMP204;
// the original project had everything in a single server.js.
//
//   db.js                — SQLite connection
//   middleware/locals.js — injects user + activeSession into every template
//   middleware/auth.js   — requireAuth (cookie) + requireApiAuth (JWT)
//   middleware/upload.js — multer config
//   routes/api.js        — REST API for the mobile app  [COMP204]
//   routes/web.js        — server-rendered HTML routes

const express = require('express');
const { engine } = require('express-handlebars');
const session = require('express-session');
const path = require('path');
const cors = require('cors');   // COMP204: allows the mobile app to call the API from a different origin
require('dotenv').config();     // loads JWT_SECRET and SESSION_SECRET from .env

require('./db');                         // open the database connection immediately on startup
const locals = require('./middleware/locals');
const apiRoutes = require('./routes/api');   // COMP204: REST API for the mobile app
const webRoutes = require('./routes/web');

const app = express();
const PORT = process.env.PORT || 3000;

// Handlebars view engine. The eq helper lets templates compare two values,
// e.g. {{#if (eq session.user_id user.id)}} to show owner-only controls.
app.engine('handlebars', engine({
  defaultLayout: 'main',
  layoutsDir: path.join(__dirname, 'views/layouts'),
  helpers: {
    eq: (a, b) => a === b,  // used in templates: {{#if (eq session.user_id user.id)}}
  },
}));
app.set('view engine', 'handlebars');
app.set('views', path.join(__dirname, 'views'));

// Middleware order matters: cors before routes (handles preflight),
// body parsers before routes read them, session before locals (locals reads it).

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: process.env.SESSION_SECRET || 'my-secret-key-change-this-later',
  resave: false,
  saveUninitialized: false, // don't create a session cookie until the user logs in
  cookie: {
    secure: false,          // set to true in production behind HTTPS
    maxAge: 1000 * 60 * 60 * 2, // 2 hours in milliseconds
  },
}));

app.use(locals);                                        // populates res.locals.user and res.locals.activeSession
app.use(express.static(path.join(__dirname, 'public'))); // serves /public/uploads/ images

// /api prefix keeps API routes separate from web routes — both have /sessions
// but at /api/sessions vs /session (added for COMP204).
app.use('/api', apiRoutes);
app.use('/', webRoutes);

// 0.0.0.0 accepts on all interfaces — needed for ngrok and LAN access.
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
