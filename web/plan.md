# Bouldering Blog - Project Overview

## Technology Stack

- **Backend:** Node.js + Express
- **Templating:** Handlebars
- **Database:** SQLite3 (timer-based sessions with start_time/end_time)
- **Deployment:** Docker to kemeneth.net server
- **Auth:** User accounts (email/password with bcrypt hashing)
- **File Upload:** Multer for image handling (5MB limit, image validation)
- **Session Management:** Express-session for authentication state

---

## Core Features

1. User registration and login with secure password hashing
2. Split-screen login page (Climb Europe style, responsive)
3. Timer-based climbing sessions (start/end with automatic duration calculation)
4. Log climbs within sessions: photo (optional), grade (V-scale), description, attempts, topped status, zones
5. View all climbs on public homepage feed
6. Personal dashboard showing user's sessions and climbs
7. Single active session per user (must end current session before starting new one)

---

## Database Schema

### Users Table
`id`, `email` (unique), `password` (hashed), `username`, `created_at`

### Sessions Table
`id`, `user_id` (FK), `gym_name`, `start_time`, `end_time` (nullable for active sessions), `notes`, `created_at`

### Climbs Table
`id`, `session_id` (FK), `image_path` (nullable), `grade`, `description`, `attempts`, `topped` (boolean), `zones`, `created_at`

Foreign keys with CASCADE delete ensure data integrity.

---

## Build Progress

### Phase 1: Foundation
**Status:** Completed

**Achievements:**
- Environment setup with Node.js, Express, SQLite3, Handlebars, bcrypt, multer
- Project structure with views, layouts, public folders
- Database initialization script with proper schema
- Static file serving and CSS styling
- Git repository setup and version control workflow

---

### Phase 2: Authentication
**Status:** Completed

**Achievements:**
- User registration with email validation and duplicate checking
- Password hashing with bcrypt (10 salt rounds)
- Login with credential verification
- Logout with session destruction
- Session middleware tracking logged-in users
- Protected routes using requireAuth middleware
- Template variable error handling (security: errors not in URLs)

---

### Phase 3: UI/UX
**Status:** Completed

**Achievements:**
- Main layout template with conditional navigation
- Split-screen login page with registration call-to-action
- Responsive design (boxes stack on screens under 768px)
- CSS styling with bordered containers and visual hierarchy
- Form styling with consistent input fields and buttons

---

### Phase 4: Session Management
**Status:** In Progress

**Completed:**
- Database schema updated for timer-based sessions (removed duration field, added start_time/end_time)
- User middleware enhanced to check for active climbing sessions
- Templates now have access to user data and activeSession status
- Navigation ready to display "Active Session" vs "Sessions" conditionally

**Current Task:** Implementing session management routes (create session, view session detail, end session, add climbs to session)

---

### Phase 5: Climb Logging
**Status:** Pending

**Planned Work:**
- Create session route with gym name input
- Session detail page showing session info and climbs
- Add climb to session with all fields (grade, attempts, topped, zones, description, optional image)
- Image upload processing and storage
- End session route to stop timer and add notes

---

### Phase 6: Data Display
**Status:** Pending

**Planned Work:**
- Homepage feed showing all climbs from all users
- Climb cards with image, username, grade, stats
- User dashboard showing personal sessions
- Session statistics (total climbs, tops, best grade)

---

### Phase 7: Deployment
**Status:** Pending

**Planned Work:**
- Docker configuration file
- Deploy to kemeneth.net server
- Accessible at dr-aj313798.kemeneth.net

---

### Phase 8: Documentation
**Status:** Pending

**Planned Work:**
- A1 poster design with wireframes, UML diagrams, technology overview
- QR code linking to deployed site
- Challenges and solutions documentation

---

## Design Decisions

All architectural decisions recorded in `decisions.md` with rationale and implementation impact including:
- Session-first workflow
- Template variable error handling
- Optional image uploads
- Timer-based duration tracking
- Single active session per user
- Notes added at session end
- Navigation state management

---

## Known Issues Resolved

- [x] Syntax error in login route (extra closing brace)
- [x] Inconsistent error handling mixing redirects and renders
- [x] No logout functionality
- [x] Session configuration security (saveUninitialized)
- [x] Database schema mismatch with timer-based sessions
- [x] User middleware not checking for active sessions

---

## Next Immediate Steps

1. Update navigation to show "Sessions" or "Active Session" based on activeSession status
2. Create "Start New Session" route and form
3. Build session detail page to view session and add climbs
4. Implement "Add Climb" functionality with image upload
5. Create "End Session" route to stop timer and add notes

---

**Started:** 13/01/2025  
**Last Updated:** 15/01/2025