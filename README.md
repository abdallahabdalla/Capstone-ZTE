# MSIT 5910-01 Capstone Project: Zero Trust Architecture for SMEs

## Project Overview

This project is a right-sized Zero Trust Authentication system built for small and medium enterprises (SMEs). It uses Authentik as an OpenID Connect (OIDC) identity provider with mandatory multi-factor authentication (MFA), a Node.js/Express backend with JWT validation middleware, and a Vite frontend dashboard. All services run locally using Docker Compose.

The goal is to demonstrate that a lightweight Zero Trust architecture can be implemented without enterprise-level hardware or network complexity, using only the Identity and Application zones.


## Architecture

The system is made up of three zones.

The Client Zone is a Vite vanilla JavaScript frontend running at http://localhost:5173. It handles login, token storage, token refresh, and logout.

The Identity Zone is Authentik running at http://localhost:9000. It handles OIDC authorization, MFA via Authy TOTP, and issues RS256 signed JWTs with a 5-minute expiration.

The Application Zone is a Node.js/Express backend running at http://localhost:4000. It validates every incoming JWT using express-jwt and jwks-rsa before allowing access to the protected endpoint.


## Features

Login with MFA using Authy Authenticator (TOTP) via Authentik OIDC

Protected endpoint at GET /secure-data requiring a valid Bearer token

JWT access tokens with 5-minute expiration

Token refresh that runs automatically at 1 minute remaining and manually via a button

Logout that clears tokens locally and redirects home

1-hour inactivity auto-logout with a 5-minute warning banner and a Stay Logged In button

Docker rapid restart policy with health checks on all four containers

24 unit tests passing across backend and frontend


## Prerequisites

Make sure you have the following installed on your machine before getting started.

- Docker Desktop
- Node.js
- Git
- Authy Authenticator (for MFA)
- Postman (optional, for API testing)



## Installation and Setup

**Step 1 — Clone the repository**

```bash
git clone https://github.com/abdallahabdalla/Capstone-ZTE.git
cd Capstone-ZTE
```

**Step 2 — Install backend dependencies**

```bash
cd backend
npm install
cd ..
```

**Step 3 — Install frontend dependencies**

```bash
cd client
npm install
cd ..
```

**Step 4 — Configure environment variables**

Open `backend/.env` and confirm the following values are set:

```
JWKS_URI=http://localhost:9000/application/o/my-app/jwks/
AUTHENTIK_ISSUER=http://localhost:9000/application/o/my-app/
```



## Running the Project

Open three separate terminal windows and run one command in each.

**Terminal 1 — Start Authentik**

```bash
cd ~/Documents/Capstone-ZTE/authentik-config
docker compose up -d
```

**Terminal 2 — Start the backend**

```bash
cd ~/Documents/Capstone-ZTE/backend
node server.js
```

**Terminal 3 — Start the frontend**

```bash
cd ~/Documents/Capstone-ZTE/client
npx vite
```

Once all three are running, open your browser and go to http://localhost:5173.


## Running the Tests

**Backend tests**

```bash
cd backend
npm test
```

**Frontend tests**

```bash
cd client
npm test
```

You should see 24 tests passing. 8 backend and 16 frontend. Test types covered include happy path, negative, boundary, state, and structural.


## Project Version History

| Tag | Description |
|-----|-------------|
| v1.0 | Core JWT auth flow with MFA and protected endpoint |
| v1.1 | Logout flow implemented |
| v1.2 | Token refresh (auto at 1 min and manual button) |
| v1.3 | Unit testing complete (24 tests passing) |
| v1.4 | Docker rapid restart policy and health checks |
| v1.5 | Logout redirect bug fix |
| v1.6 | 1-hour inactivity auto-logout with 5-min warning banner |




