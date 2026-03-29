# Bloc

A distributed bouldering session tracker built for COMP204 (Distributed Systems) at Falmouth University. Bloc allows climbers to log sessions and climbs from both a web browser and a mobile app, with all data shared through a single backend.

## Architecture

```
mobile/   ──┐
             ├──▶  web/server.js (Express REST API)  ──▶  SQLite DB
web views ──┘
```

Two clients, one backend:
- The **web app** is a server-rendered site for logging sessions from a browser
- The **mobile app** is a React Native app for logging sessions on the go
- Both read and write to the same database, so data is shared across clients in real time

## Structure

```
Bloc/
├── mobile/          # React Native mobile app (Expo)
├── web/             # Express web app + REST API
├── docs/
│   ├── uml/         # UML diagrams
│   └── business-plan/
└── README.md
```

## Getting Started

### Web (API + Website)

```bash
cd web
npm install
cp .env.example .env   # add your SESSION_SECRET
node init-database.js  # initialise the SQLite database
node server.js
```

Runs on `http://localhost:3000`

### Mobile

```bash
cd mobile
npm install
npx expo start
```

Scan the QR code with Expo Go, or run on a simulator with `npm run android` / `npm run ios`.

> The mobile app points to the hosted API by default. To develop locally, update the base URL in `mobile/services/api.ts`.

## Tech Stack

| Layer | Technology |
|---|---|
| Mobile client | React Native, Expo, TypeScript |
| Web client | Express, Handlebars, CSS |
| REST API | Express (Node.js) |
| Database | SQLite3 |
| Auth | bcrypt + express-session / JSON response for mobile |
| File uploads | Multer |

## Features

- User registration and login (shared across web and mobile)
- Start and end timed climbing sessions with gym name
- Log individual climbs with grade, attempts, topped status, zones, and optional photo
- Public session feed visible to all users
- Mobile app syncs with the same data as the website

## Deployment

The web server is hosted at `dr-aj313798.kemeneth.net`. The mobile app connects to this endpoint for all API calls.

## Author

AJ313798 — Falmouth University, COMP204 Distributed Systems
