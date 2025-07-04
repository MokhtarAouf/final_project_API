# Microservices Documentation

## Microservice-1 (Analytics)
- **Environment Variable:**
  - MONGODB_URI: MongoDB connection string (e.g., mongodb://localhost:27017/analytics_db)
- **Endpoint:**
  - `POST /analytics/track` — Stores activity logs in MongoDB

## Microservice-2 (Notifications)
- **Environment Variable:**
  - REDIS_URL: Redis connection string (e.g., redis://localhost:6379)
- **Endpoint:**
  - `POST /notifications/send` — Stores notification (to be implemented)

## Usage Notes
- Add your secrets to a `.env` file in each microservice directory based on the required variables above.
- Use Postman or curl to test endpoints. 