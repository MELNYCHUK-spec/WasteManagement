# EcoRoute — waste monitoring system

EcoRoute is a web application for monitoring container fill levels and planning waste collection. The dashboard displays containers on a map, current readings, and sensor status; routes are planned from the user's location through critical points.

The interface supports Ukrainian and English. The demo dataset contains 10 containers in Odesa.

## Features

- Container map with search and status filtering;
- Overview of the total number of containers, full and nearly full containers, and average fill level;
- Dashboard data refreshes every 15 seconds;
- Route planning to containers marked as `full`, based on the user's geolocation;
- Registration and sign-in with email verification, plus password recovery;
- Sensor readings ingestion, measurement history, and Discord notifications;
- Sensor simulator for demonstrating the system.

## Technologies

- **Client:** React 18, TypeScript, Vite, Leaflet / React Leaflet
- **Server:** Node.js 22, Express, TypeScript
- **Database:** PostgreSQL 16
- **Deployment:** Docker Compose; optionally ngrok for a public tunnel

## Quick start with Docker

Docker Engine or Docker Desktop with Compose is required. Create a `.env` file in the project root and set at least these two values:

```dotenv
POSTGRES_PASSWORD=replace_with_a_secure_password
COMPOSE_DATABASE_URL=postgres://eco:replace_with_a_secure_password@db:5432/ecoroute
```

The password in `COMPOSE_DATABASE_URL` must match `POSTGRES_PASSWORD`. Start the services:

```bash
docker compose up --build
```

Open <http://localhost:4000>. The API is available at the same address; its health check is at <http://localhost:4000/api/health>. Compose starts PostgreSQL, the API, and the readings simulator. Ngrok runs as an optional service; set `NGROK_AUTHTOKEN` to create a public tunnel.

To stop the services, press `Ctrl+C`, then run `docker compose down`. PostgreSQL data is stored in the Docker volume `postgres_data`; to remove the database and its data, use `docker compose down -v`.

## Local development

Node.js 22+, npm, and an available PostgreSQL 16 instance are required. Create the `ecoroute` database, apply `database/init.sql`, install dependencies, and configure the environment:

```bash
npm ci
```

Create a `.env` file with the connection string for your local database and any required settings, for example:

```dotenv
DATABASE_URL=postgres://eco:password@localhost:5432/ecoroute
PORT=4000
ALERT_THRESHOLD=85
```

Start the client and API in development mode:

```bash
npm run dev
```

Vite is available at <http://localhost:5173>, and the API runs on port `4000`. Configure SMTP to use user accounts (see the environment variables below). You can run the simulator separately with `npm run simulate`; by default, it sends readings to `http://localhost:4000` every 15 seconds.

## Environment variables

| Variable | Description | Default / requirement |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string for local runs | Required for the API outside Compose |
| `COMPOSE_DATABASE_URL` | API connection string for the database in Compose | Required when running Compose; the host is usually `db` |
| `POSTGRES_PASSWORD` | PostgreSQL user password in Compose | Required |
| `PORT` | API port | `4000` |
| `ALERT_THRESHOLD` | Fill percentage threshold for the `full` status and alerts | `85` |
| `SENSOR_API_KEY` | Bearer token for submitting sensor readings | Unset; if set, send it in `Authorization: Bearer <key>` |
| `SIMULATOR_INTERVAL_MS` | Simulator interval | `15000` |
| `API_URL` | API address used by the simulator | `http://localhost:4000`; in Compose: `http://api:4000` |
| `DISCORD_WEBHOOK_URL` | Discord webhook for notifications about full containers | Unset |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE` | SMTP server and TLS settings | Port `587`, `SMTP_SECURE=false` |
| `SMTP_USER`, `SMTP_PASS` | SMTP credentials | Required for registration and password recovery |
| `MAIL_FROM` | Sender email address | Required for registration and password recovery |
| `APP_BASE_URL` | Public base URL used for links in emails | Defaults to `http://localhost:4000` in Compose |
| `CORS_ORIGINS` | Comma-separated allowed browser origins | `http://localhost:5173,http://127.0.0.1:5173` |
| `NGROK_AUTHTOKEN` | ngrok token for a public tunnel | Unset |

Registration is available only when email delivery is configured. Account passwords must be 12–128 characters long. Browser geolocation works on `localhost` or over HTTPS.

Do not commit real passwords, SMTP credentials, or tokens to the repository. Use a local `.env` file and keep it out of version control.

## API

Protected routes require an active session. The only exception is `POST /api/measurements` when `SENSOR_API_KEY` is configured; it can be called with the sensor's Bearer token.

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/health` | Check API availability and database connectivity |
| `POST` | `/api/auth/register` | Register and send a verification email |
| `GET` | `/api/auth/verify?token=...` | Verify an email address |
| `POST` | `/api/auth/login` | Sign in |
| `POST` | `/api/auth/logout` | Sign out |
| `GET` | `/api/auth/me` | Get the current user |
| `POST` | `/api/auth/forgot-password` | Request a password reset link |
| `POST` | `/api/auth/reset-password` | Set a new password using a token |
| `GET` | `/api/containers` | List containers and their latest known readings |
| `GET` | `/api/stats` | Get summary statistics |
| `GET` | `/api/measurements?containerId=CNT-001` | Get recent readings, optionally for one container |
| `POST` | `/api/measurements` | Submit a sensor measurement |

Example request body for submitting a reading:

```json
{
  "containerId": "CNT-001",
  "fillPercent": 86,
  "weightKg": 103.2
}
```

`fillPercent` must be a number from 0 to 100, and `weightKg` must be a non-negative number. The `full` status is assigned when `ALERT_THRESHOLD` is reached; `warning` is assigned starting at 70%.

## Project commands

| Command | Description |
|---|---|
| `npm run dev` | Start the API and Vite for development |
| `npm run dev:api` | Start the API with automatic restarts on changes |
| `npm run dev:web` | Start Vite |
| `npm run build` | Build the TypeScript API and client application |
| `npm start` | Start the built server and serve the client files |
| `npm run simulate` | Start the sensor simulator |
| `npm run typecheck` | Check client and server types |

## Project structure

```text
database/   Database schema and SQL migrations
server/     Express API, authentication, email, and routes
simulator/  Generator for demo sensor readings
web/src/    React interface, map, and localization
```
