// Two auth middlewares, one for each client:
//   requireAuth    — web routes; checks the session cookie
//   requireApiAuth — API routes; checks a JWT Bearer token  [COMP204]
//
// Browsers send cookies automatically on same-origin requests; mobile apps
// can't, so they store a JWT and send it explicitly. JWTs work well here
// because they're self-contained — the server doesn't need to store them.

const jwt = require('jsonwebtoken');

// JWT_SECRET signs and verifies tokens — stored in .env so it is
// never hardcoded. The fallback is only for local development.
const JWT_SECRET = process.env.JWT_SECRET || 'jwt-secret-change-this-in-production';

// Redirects to /login if no session cookie. Saves the original URL in
// req.session.returnTo so the user lands back where they were after logging in.
const requireAuth = (req, res, next) => {
  if (req.session.userId) return next();
  req.session.returnTo = req.originalUrl; // remember where they were going
  res.redirect('/login');
};

// Reads Authorization: Bearer <token>, verifies the signature against
// JWT_SECRET, and attaches req.userId. Returns 401 if the token is
// missing, expired, or tampered with.
const requireApiAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];

  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.status(401).json({ error: 'Invalid or expired token' });
    req.userId = decoded.userId;
    next();
  });
};

module.exports = { requireAuth, requireApiAuth, JWT_SECRET };
