// SQLite connection singleton — Node's require() cache means this runs once
// regardless of how many modules import it. Set DATABASE_PATH in .env to swap
// in a test database without touching code. Crashes on connect failure.

const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database(
  process.env.DATABASE_PATH || './database.db',
  (err) => {
    if (err) {
      // Hard exit — no point continuing without a database
      console.error('Database connection error:', err.message);
      process.exit(1);
    }
    console.log('Connected to SQLite database');
  }
);

module.exports = db;
