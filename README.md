# Bloc

A distributed bouldering session tracker built for COMP204 (Distributed Systems) at Falmouth University. Climbers log sessions and individual climbs from a web browser or a phone; all data goes to the same backend so both views stay in sync.

## Links

- **Live site:** https://bloc-production.up.railway.app
- **Presentation:** https://docs.google.com/presentation/d/1rAcBW8GpqGUgIRTlzeQffiX7-sa3fTrjjedEQod0aAk/edit?usp=sharing

## Architecture

```
mobile/   ──┐
             ├──▶  web/server.js (Express REST API)  ──▶  SQLite DB
web views ──┘
```

Two clients, one backend:
- The **web app** is a server-rendered site (Express + Handlebars) with cookie-based auth
- The **mobile app** is a React Native / Expo app with JWT bearer auth
- Both read and write to the same SQLite database

## Structure

```
bloc-system/
├── mobile/               # React Native mobile app (Expo)
│   ├── app/              # Screens (Expo Router)
│   ├── context/          # AuthContext (JWT storage)
│   └── services/api.ts   # HTTP client for the REST API
├── web/                  # Express web app + REST API
│   ├── routes/api.js     # REST API consumed by the mobile app
│   ├── routes/web.js     # Server-rendered HTML routes
│   ├── middleware/       # auth, upload, locals
│   ├── views/            # Handlebars templates
│   └── server.js         # Entry point
└── docs/
    ├── uml/              # PlantUML diagrams (ER, component, sequence)
    ├── business-plan/    # Business plan document
    └── poster/           # COMP204 submission poster (LaTeX)
```

## Getting Started

### Web (API + website)

```bash
cd web
npm install
cp .env.example .env      # set SESSION_SECRET and JWT_SECRET
npm start                 # initialises the DB then starts the server
```

Runs on `http://localhost:3000`

### Mobile

```bash
cd mobile
npm install
npx expo start
```

Scan the QR code with Expo Go, or run `npm run android` / `npm run ios`.

> The mobile app points to the hosted Railway API by default. To develop locally, change `API_URL` in `mobile/services/api.ts`.

## Tech Stack

| Layer | Technology |
|---|---|
| Mobile client | React Native, Expo, TypeScript |
| Web client | Express, Handlebars, CSS |
| REST API | Express (Node.js) |
| Database | SQLite3 |
| Auth (web) | bcrypt + express-session (cookie) |
| Auth (mobile) | bcrypt + JWT (jsonwebtoken) |
| File uploads | Multer |
| Hosting | Railway |

## Author

AJ313798 — Falmouth University, COMP204 Distributed Systems
