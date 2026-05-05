# Bloc — Business Plan

**Module:** COMP204 Distributed Systems  
**Author:** AJ313798 — Falmouth University  
**Date:** May 2026

---

## 1. Executive Summary

Bloc is a distributed bouldering session tracker that lets climbers log sessions and individual climbs from both a web browser and a native mobile app, with all data shared in real time through a single hosted REST API. The platform solves a real problem for climbers who want a structured record of their progress across visits to different gyms — something no existing tool does simply and openly.

The system is live at `dr-aj313798.kemeneth.net` and consists of two clients (a server-rendered web app and a React Native mobile app) backed by a single Express/SQLite REST API. Users register once and can access their data from any device.

---

## 2. Problem Statement

Bouldering has grown significantly in popularity in the UK, with indoor climbing gyms seeing consistent year-on-year growth in membership. Despite this, most climbers track their progress informally — notepads, phone camera rolls, or memory. The few dedicated apps that exist (Vertical Life, 27crags) are focused on outdoor route databases rather than gym session logging.

There is a clear gap for a lightweight, gym-agnostic session tracker that:

- Records timed sessions with a specific gym
- Logs individual climbs within a session (grade, attempts, whether it was topped, zones reached, optional photo)
- Provides a social feed so climbers can see what others at the same gym have been logging
- Works from both a phone and a desktop browser

---

## 3. Proposed Solution

Bloc addresses this gap with a minimal, focused distributed system. The core workflow is:

1. A user starts a timed session at a named gym
2. They log each boulder problem attempted — grade (V-scale), attempts, topped/not-topped, zones, optional photo
3. When finished, they end the session and add optional notes
4. Their completed session appears on the public feed

The system is deliberately simple: no gamification, no social graph, no advertising. The value proposition is the log itself.

---

## 4. System Architecture

### 4.1 Overview

Two clients share one backend:

```
Mobile App (React Native / Expo)  ──┐
                                     ├──▶  Express REST API  ──▶  SQLite DB
Web App (server-rendered HTML)    ──┘          │
                                               └──▶  public/uploads/ (images)
```

### 4.2 Technology Stack

| Layer | Technology | Rationale |
|---|---|---|
| Mobile client | React Native, Expo, TypeScript | Cross-platform (iOS + Android), large ecosystem, Expo simplifies builds |
| Web client | Express, Handlebars | Server-rendered HTML — no JS framework needed for simple CRUD views |
| REST API | Express (Node.js) | Same language as web server, minimal overhead, shares DB module |
| Database | SQLite3 | Zero-configuration, file-based, sufficient for a single-server deployment |
| Auth (web) | express-session + bcrypt | Stateful cookie session — standard for browser clients |
| Auth (mobile) | JWT (jsonwebtoken) + bcrypt | Stateless token — mobile clients cannot rely on cookies |
| File uploads | Multer | Handles multipart/form-data for climb photos |
| Deployment | VPS (kemeneth.net) | Single server hosting the API and serving static files |

### 4.3 Key Design Decisions

**Dual authentication mechanism.** The web app uses a cookie-based session (standard for browsers) while the mobile app uses JWT Bearer tokens (mobile clients cannot rely on automatic cookie handling). Both share the same user table and bcrypt password hashes — the difference is only in how the credential is transmitted.

**Shared database.** Both clients write to the same SQLite database, so a session started on the website is immediately visible in the mobile app and vice versa. This is the core distributed property of the system.

**Single active session constraint.** A user can only have one active (un-ended) session at a time. This is enforced at the database query level (`WHERE end_time IS NULL`) rather than in application state, making it consistent across both clients.

**Relative image paths.** Climb photos are stored in `public/uploads/` on the server. The database stores the relative URL (`/uploads/<filename>`) rather than the full path, so the same value works whether accessed from the web app or constructed as an absolute URL by the mobile app.

---

## 5. Target Market

**Primary users:** indoor boulderers aged 18–35 who visit climbing gyms regularly (1–4 times per week) and want structured progress tracking.

**Market size:** the British Mountaineering Council estimates over 500,000 indoor climbers in the UK. The Association of British Climbing Walls reports over 450 indoor walls nationally, with continued growth post-pandemic.

**User personas:**

- **The Improver** — climbs 2–3 times a week, works specific grades, wants to see whether their completion rate on V4s is improving over time.
- **The Social Climber** — interested in what others at the same gym have been logging; uses the feed to discover which problems are popular.
- **The Occasional Visitor** — drops into a gym a few times a year; wants a simple log without committing to a full training app.

---

## 6. Competitive Analysis

| Product | Session logging | Gym-agnostic | Mobile + Web | Open feed | Photo per climb |
|---|---|---|---|---|---|
| **Bloc** | Yes (timed) | Yes | Yes | Yes | Yes |
| Vertical Life | No | Route database only | Yes | No | No |
| 27crags | No | Outdoor focus | Yes | No | No |
| Spreadsheet/notepad | Possible | Yes | No | No | Possible |
| Strava (gym mode) | Partial | Yes | Yes | Yes | No |

Bloc's key differentiator is the combination of timed session tracking, per-climb photo logging, and a shared public feed — none of the existing tools offer all three for indoor bouldering specifically.

---

## 7. Revenue Model (Hypothetical)

For a production deployment, two monetisation avenues are viable:

**Freemium.** Core logging (unlimited sessions, text data) free. A paid tier unlocks photo storage beyond a monthly quota and historical statistics (e.g. grade progression charts, topped percentage over time).

**Gym partnerships.** Partner gyms embed a QR code on the entrance desk linking directly to a pre-filled "start session at [Gym Name]" screen. Gyms pay a flat monthly fee for branded placement and aggregate (anonymised) data about peak times and popular grades.

Both models preserve the open feed as a free feature, which is the main driver of organic growth.

---

## 8. Development Roadmap

| Phase | Deliverable | Status |
|---|---|---|
| 1 | Project scaffolding, database schema, Express server | Complete |
| 2 | User registration and login (web) | Complete |
| 3 | Web UI/UX — layout, login page, navigation | Complete |
| 4 | Session management — start, view, end (web) | Complete |
| 5 | Climb logging — grade, attempts, topped, photo (web) | Complete |
| 6 | Public feed and user dashboard (web) | Complete |
| 7 | REST API for mobile (`/api/*` routes, JWT auth) | Complete |
| 8 | React Native mobile app — all screens | Complete |
| 9 | Server deployment to kemeneth.net | Complete |
| 10 | UML documentation and business plan | Complete |

---

## 9. Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| SQLite does not scale to concurrent writes | Low (single-user demo) | High | Migrate to PostgreSQL for production; db.js is the only module to change |
| JWT secret leaked | Low | High | Secret stored in `.env`, never committed to version control |
| Image storage fills disk | Medium | Medium | Multer enforces 5 MB per file; production would move uploads to object storage (S3) |
| ngrok URL changes between sessions | High (dev only) | Medium | `API_URL` in `api.ts` updated to permanent hosted URL for submission |

---

## 10. Conclusion

Bloc demonstrates a complete distributed system: two geographically independent clients (web browser and mobile device) communicating with a hosted server over HTTP, sharing a persistent database, with distinct but compatible authentication mechanisms for each client type. The system is live, functional, and addresses a genuine user need in the growing indoor climbing market.
