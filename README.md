# SOC Monitoring Portal

A modern full-stack SOC Detection & Alerting Platform built with Vue, Vite, NestJS, JWT authentication, REST APIs, and PostgreSQL-ready storage. It generates realistic audit and security events for Splunk or ELK demonstrations.

## Features

- Registration, login, logout, forgot/reset password, remember me, lockout after 5 failed logins
- Profile management, password changes, login history, activity timeline
- Admin dashboard for users, audit logs, security events, password resets, and user lifecycle
- Contact form and authenticated file uploads
- Database logging plus newline-delimited JSON logs in `backend/logs/security-events.jsonl`
- Dashboard widgets for users, events, failed logins, locked accounts, sessions, attacker IPs, and recent activity
- Responsive dark SOC UI with tables, filters, CSV export, loading states, and error handling

## Quick Start

```bash
npm run install:all
npm run dev
```

Frontend: http://localhost:5173
Backend: http://localhost:4000

## Run Frontend And Backend Separately

Open two terminals.

Terminal 1, backend:

```bash
cd backend
npm run start:dev
```

Terminal 2, frontend:

```bash
cd frontend
npm run dev
```

You can also run the same commands from the project root:

```bash
npm run dev:backend
npm run dev:frontend
```

The frontend is pinned to port `5173`. If Vite says the port is already in use, stop the old frontend process first so the API CORS origin stays predictable.
If you serve the frontend from more than one origin, set a comma-separated backend allowlist:

```bash
FRONTEND_URLS=http://192.168.110.86,http://192.168.110.86:5173
```

Default admin user:

- Email: `admin@soc.local`
- Password: `Admin123!`

If login fails in the browser, confirm the backend is running by opening http://localhost:4000/health. It should return:

```json
{"status":"ok","service":"soc-monitoring-portal"}
```

## PostgreSQL

Local demo mode uses a JSON-backed store automatically. For PostgreSQL, create a database using `backend/schema.sql`, then set:

```bash
DATABASE_URL=postgres://user:password@localhost:5432/soc_portal
```

## API Docs

See [docs/API.md](docs/API.md).
# SOC_Portal
