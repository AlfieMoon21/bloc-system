# Bloc - Bouldering Session Tracker

A web application for indoor climbing enthusiasts to log climbs, track sessions, and share progress with the community.

## Features

- Secure user registration and login with password hashing
- Timer-based session tracking (start/end with automatic duration)
- Log climbs with grade (V-scale), attempts, topped status, zones, and optional photos
- Instagram-style public feed with photo collages
- Owner-only edit controls
- Responsive design for mobile and desktop

## Tech Stack

- **Backend:** Node.js + Express
- **Database:** SQLite3
- **Templating:** Handlebars
- **Authentication:** bcrypt + express-session
- **File Upload:** Multer
- **Version Control:** Git

## Installation

1. Clone the repository:
```bash
git clone https://github.falmouth.ac.uk/AJ313798/bouldering-blog.git
cd bouldering-blog
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory:
```bash
touch .env
```

4. Add the following environment variables to `.env`:
```
PORT=3000
DATABASE_PATH=./database.db
SESSION_SECRET=your-secret-key-here
```

**Environment Variables Explained:**
- `PORT` - The port the server runs on (default: 3000)
- `DATABASE_PATH` - Path to the SQLite database file (default: ./database.db)
- `SESSION_SECRET` - Secret key for signing session cookies (use a long random string in production)

5. Initialise the database:
```bash
node init-database.js
```

6. Create the uploads folder:
```bash
mkdir -p public/uploads
```

7. Start the server:
```bash
node server.js
```

8. Visit `http://localhost:3000` in your browser

## Project Structure
```
bouldering-blog/
├── server.js           # Main application file
├── init-database.js    # Database initialisation script
├── database-schema.sql # SQL schema for tables
├── package.json        # Dependencies
├── .env                # Environment variables (not committed)
├── decisions.md        # Design decisions documentation
├── public/
│   ├── css/
│   │   └── style.css   # Stylesheet
│   └── uploads/        # User uploaded images
└── views/
    ├── layouts/
    │   └── main.handlebars    # Main layout template
    ├── home.handlebars        # Homepage with session feed
    ├── login.handlebars       # Login page
    ├── register.handlebars    # Registration page
    ├── new-session.handlebars # Start new session
    ├── session-detail.handlebars # View session and climbs
    └── add-climb.handlebars   # Add climb form
```

## Database Schema

Three tables with one-to-many relationships:

- **Users** - id, email, password, username, created_at
- **Sessions** - id, user_id (FK), gym_name, start_time, end_time, notes, created_at
- **Climbs** - id, session_id (FK), image_path, grade, description, attempts, topped, zones, created_at

Foreign keys use CASCADE delete to maintain data integrity.

## Security Features

- bcrypt password hashing (10 salt rounds)
- Session cookies with expiry
- File upload validation (extension + MIME type, 5MB limit)
- Parameterised SQL queries (prevents injection)
- Owner verification for edit actions

## Author

AJ313798 - Falmouth University

## License

This project was created for COMP202 Web Technologies assignment.
