# Monorepo Setup Steps (final_project)

## 1. Initialized npm in the root directory
- Created root `package.json`.

## 2. Configured npm workspaces
- Added the following to `package.json`:
  ```json
  "workspaces": [
    "frontend",
    "backend-main",
    "microservice-1",
    "microservice-2",
    "shared"
  ]
  ```

## 3. Initialized each workspace
- Ran `npm init -y` in:
  - frontend
  - backend-main
  - microservice-1
  - microservice-2
  - shared

---

## Backend-Main Setup

### Required Environment Variables
- JWT_SECRET: Secret key for signing JWTs
- OPENWEATHER_API_KEY: API key for OpenWeather

### Implemented Endpoints
- `POST /api/auth/login-google` — Accepts `{ token }` in body, returns JWT (mocked for now)
- `GET /api/public` — Public endpoint
- `GET /api/protected` — Protected endpoint, requires JWT in Authorization header
- `GET /api/weather?city=CityName` — Fetches weather data from OpenWeather

### Usage Notes
- Add your secrets to a `.env` file in `backend-main/` based on `.env.example`.
- Use Postman or curl to test endpoints.

_Next steps will be added as the project progresses._ 