// Database initialization script
// Run with: node init-database.js

const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
require('dotenv').config();

const DB_PATH = process.env.DATABASE_PATH || './database.db';

const dbExists = fs.existsSync(DB_PATH);

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
    process.exit(1);
  }

  if (dbExists) {
    console.log('Connected to existing database');
  } else {
    console.log('Created new database file');
  }
});

const schema = fs.readFileSync('./database-schema.sql', 'utf8');

db.serialize(() => {
  const statements = schema.split(';').filter((stmt) => stmt.trim());

  statements.forEach((statement) => {
    db.run(statement, (err) => {
      if (err) {
        console.error('Error creating table:', err.message);
      }
    });
  });

  console.log('Database tables created successfully!');

  db.all(
    "SELECT name FROM sqlite_master WHERE type='table'",
    [],
    (err, tables) => {
      if (err) {
        console.error('Error listing tables:', err.message);
      } else {
        console.log('Tables in database:');
        tables.forEach((table) => console.log('   -', table.name));
      }
    }
  );
});

db.close((err) => {
  if (err) {
    console.error('Error closing database:', err.message);
  } else {
    console.log('Database connection closed');
  }
});
