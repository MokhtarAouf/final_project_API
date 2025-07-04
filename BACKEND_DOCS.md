# Backend-Main Documentation

## Required Environment Variables
- JWT_SECRET: Secret key for signing JWTs
- OPENWEATHER_API_KEY: API key for OpenWeather

## Implemented Endpoints
- `POST /api/auth/login-google` — Accepts `{ token }` in body, returns JWT (mocked for now)
- `GET /api/public` — Public endpoint
- `GET /api/protected` — Protected endpoint, requires JWT in Authorization header
- `GET /api/weather?city=CityName` — Fetches weather data from OpenWeather

## Usage Notes
- Add your secrets to a `.env` file in `backend-main/` based on the required variables above.
- Use Postman or curl to test endpoints. 