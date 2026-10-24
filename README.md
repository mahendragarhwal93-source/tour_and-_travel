# Wanderly: Travel Planning & Booking System

Full stack web application (Project 3 of the syllabus). Users explore destinations, plan multi-stop trips with dates, and book them. Admins manage destinations and see all bookings.

**Stack:** React 18 (Vite) · Bootstrap 5 · Node.js + Express · SQLite (Node built-in `node:sqlite`) · JWT authentication

## Syllabus mapping

| Requirement | Where |
|---|---|
| Destination listings with images and details | `client/src/pages/Destinations.jsx`, details modal, home carousel |
| Search and filter options | Search bar + category/country/max price/sort, filtered by backend (`GET /api/destinations`) |
| Trip planning (select destinations, dates) | `Trips.jsx`, `TripDetail.jsx`, `AddToTripModal.jsx` |
| Booking functionality | `POST /api/bookings`, booking modal, cancel/re-book |
| Backend APIs for trips and users | `server/routes/*.js` |
| Database integration | SQLite, 5 tables: `users, destinations, trips, trip_destinations, bookings` (`server/db.js`) |
| Responsive UI (Bootstrap grid, cards, carousel, modals, navbar) | whole client |
| Registration/login, JWT, protected routes | `AuthContext.jsx`, `Guards.jsx`, `middleware/auth.js` |
| Form validation (client and server) and error handling | `AuthPages.jsx`, server validators returning `{ error, errors }` with 400/401/403/404/409 |
| React concepts: reusable components, useState/useEffect, context | `client/src/components/*` |
| Testing | `server/test/api.test.js` (12 tests) + Postman collection |
| Git version control | see "Git workflow" below |

## Setup (Windows / Linux / macOS)

Requirements: Node.js 22.13 or newer (Node 24 LTS works). No C++ compiler needed.

```bash
# 1. install dependencies for server and client
npm run install-all

# 2. build the React app
npm run build

# 3. start everything (API + website) on http://localhost:5000
npm start
```

Open http://localhost:5000. The database (`server/travel.db`) and sample data are created automatically on first start.

**Demo accounts**

| Role | Email | Password |
|---|---|---|
| User | demo@travel.com | demo123 |
| Admin | admin@travel.com | admin123 |

### Development mode (hot reload)

```bash
npm run dev:server     # terminal 1, API on :5000
npm run dev:client     # terminal 2, UI on :5173 (proxies /api to :5000)
```

### Run tests

```bash
npm test
```

## API reference

Base URL: `http://localhost:5000/api`. Protected routes need `Authorization: Bearer <token>`.

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/auth/register` | - | Create account, returns JWT |
| POST | `/auth/login` | - | Login, returns JWT |
| GET | `/auth/me` | user | Current user |
| GET | `/destinations?search=&category=&country=&minPrice=&maxPrice=&sort=` | - | List/search/filter (`sort`: popular, price_asc, price_desc, name) |
| GET | `/destinations/meta/filters` | - | Categories, countries, max price |
| GET | `/destinations/:id` | - | One destination |
| POST / PUT / DELETE | `/destinations[/:id]` | admin | CRUD |
| GET / POST | `/trips` | user | List own trips / create trip |
| GET / PUT / DELETE | `/trips/:id` | owner | Read / edit / delete |
| POST | `/trips/:id/destinations` | owner | Add destination `{destination_id, days}` |
| PUT / DELETE | `/trips/:id/destinations/:destId` | owner | Change days / remove |
| POST | `/bookings` | user | Book trip `{trip_id, travelers, payment_method}` |
| GET | `/bookings` | user | Own bookings (`?all=1` for admin) |
| PUT | `/bookings/:id/cancel` | owner/admin | Cancel booking |
| GET | `/bookings/admin/stats` | admin | Dashboard numbers |

Import `Wanderly.postman_collection.json` into Postman. Run "Login (demo user)" and "Login (admin)" first; they store the tokens automatically.

## Business rules (good to mention in viva)

- Passwords are hashed with bcrypt; sessions use JWT (7 days). Invalid/expired tokens return 401, wrong role 403.
- A user can only see/edit their own trips (admin can see all).
- Trip cost = sum of (days × price/day) per person; booking total = cost × travelers (calculated on the server, never trusted from the client).
- A booked trip is locked for editing; cancelling the booking unlocks it and it can be re-booked.
- Booking requires at least one destination, a start date not in the past, 1-20 travelers and a valid payment method.
- Booking reference like `TRV-1A2B3C4D` is generated with `crypto.randomBytes`.
- All SQL uses prepared statements (no SQL injection). Booking/cancel use DB transactions.

## Project structure

```
travel-planner/
├── server/
│   ├── index.js            Express app, error handling, serves client/dist
│   ├── db.js               SQLite schema
│   ├── seed.js             16 destinations + demo/admin users
│   ├── middleware/auth.js  JWT sign/verify, admin guard
│   ├── routes/             auth, destinations, trips, bookings
│   └── test/api.test.js    automated API tests
├── client/src/
│   ├── api.js              fetch wrapper (adds JWT, parses errors)
│   ├── AuthContext.jsx     login state
│   ├── components/         Navbar, Footer, Modal, Toasts, DestinationCard, ...
│   └── pages/              Home, Destinations, AuthPages, Trips, TripDetail, Dashboard, Admin
└── Wanderly.postman_collection.json
```

## Git workflow

```bash
git init
git add .
git commit -m "Initial commit: Wanderly travel planner"
git branch -M main
git remote add origin https://github.com/<your-username>/wanderly.git
git push -u origin main
```

Tip: make several small commits (e.g. "Add auth API", "Add trip planner UI", "Add tests") so your history shows progress.

## Deployment

Single service: run `npm run install-all && npm run build` then `npm start`. On Render/Railway set the build command to `npm run install-all && npm run build`, the start command to `npm start`, and the env var `JWT_SECRET` to a long random string. (SQLite file lives on the instance disk; attach a persistent disk or switch to a hosted DB for permanent data.)

## Notes

- Destination photos load from Unsplash; if you are offline a gradient placeholder is shown automatically.
- Environment variables: `PORT` (default 5000), `JWT_SECRET`, `DB_FILE`.
