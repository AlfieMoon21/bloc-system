// Runs on every request. Attaches res.locals.user and res.locals.activeSession
// so templates don't need each route to fetch them individually.
//
// activeSession is fetched here rather than per-route because the nav bar
// shows a "Resume Session" link on every page when one is open.

const db = require('../db');

module.exports = (req, res, next) => {
  // No session cookie — user is a guest, skip both queries
  if (!req.session.userId) {
    res.locals.user = null;
    res.locals.activeSession = null;
    return next();
  }

  // exclude password hash
  db.get(
    'SELECT id, username, email FROM users WHERE id = ?',
    [req.session.userId],
    (err, user) => {
      if (err) {
        // degrade gracefully
        console.error('Error fetching user:', err);
        res.locals.user = null;
        res.locals.activeSession = null;
        return next();
      }

      res.locals.user = user;

      // A session is "active" if end_time is NULL — it hasn't been ended yet
      db.get(
        'SELECT id, gym_name, start_time FROM sessions WHERE user_id = ? AND end_time IS NULL',
        [req.session.userId],
        (err, activeSession) => {
          // On error, still continue — the page can render without this
          res.locals.activeSession = err ? null : activeSession;
          next();
        }
      );
    }
  );
};
