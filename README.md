## 📘 Project Setup Instructions (Final Project: Full Stack JS App)

---

### 🏁 INITIAL SETUP

1. Create a GitHub repository named after your project idea.
2. Initialize monorepo with folders:
   ```
   /frontend
   /backend-main
   /microservice-1
   /microservice-2
   /shared (optional utils/config)
   ```
3. Initialize each folder with `npm init -y`
4. Set up workspaces using npm or Turborepo (optional)

---

### 🎨 FRONTEND (React)

5. `npx create-react-app frontend --template typescript`
6. Install:
   ```
   npm install react-router-dom axios jwt-decode
   ```
7. Set up routing: `/login`, `/dashboard`, `/restricted`
8. Add Google Login using `@react-oauth/google`
9. Store JWT in `localStorage`
10. Add `PrivateRoute` wrapper to protect restricted routes
11. Add Axios interceptor to attach JWT in requests

---

### ⚙️ BACKEND MAIN (Node.js + Express)

12. Initialize with Express + TypeScript
13. Install:
   ```
   npm install express cors jsonwebtoken dotenv
   ```
14. Create `/api/auth/login-google` endpoint to verify Google token, return JWT
15. Middleware: `verifyJWT`
16. Set up protected route `/api/protected`
17. Expose `/api/public` (no auth)
18. Add external API call (e.g., OpenWeather, NewsAPI)
19. Include JWT-based API for third-party demo

---

### 🧩 MICROSERVICE 1 (e.g., Analytics)

20. Initialize Express service
21. Create route `/analytics/track`
22. Communicate with backend-main using internal HTTP call or message queue (optional)
23. Connect to Database A (e.g., MongoDB/PostgreSQL)
24. Store user activity logs

---

### 🧩 MICROSERVICE 2 (e.g., Notifications)

25. Initialize Express service
26. Create route `/notifications/send`
27. Accept message from backend-main
28. Connect to Database B (e.g., Redis/SQLite)
29. Store and retrieve recent notifications

---

### 🔗 COMMUNICATION

30. Backend-main consumes microservice APIs via Axios or internal proxy
31. Protect inter-service communication with shared secret or internal auth
32. Frontend talks only to backend-main

---

### 🔐 AUTHENTICATION FLOW

33. Frontend → Google login → gets Google token
34. Frontend → backend `/api/auth/login-google` → gets JWT
35. Frontend stores JWT
36. Protected frontend routes use JWT
37. Backend protects all private routes with `verifyJWT`

---

### 🧪 API DEMO (Postman)

38. Use Postman to call:
   - `/api/protected` with valid JWT → 200 OK
   - `/api/protected` without JWT → 401 Unauthorized
39. Add screenshot or video demo

---

### 🧱 DATABASE SETUP

40. Microservice 1 connects to Database A (e.g., MongoDB)
41. Microservice 2 connects to Database B (e.g., Redis)
42. Define schemas or models as needed
43. Use `.env` for database config

---

### 🧪 TESTING & ERROR HANDLING

44. Add global error middleware to all services
45. Handle 401, 403, 500 responses properly
46. Validate request payloads with Joi or zod

---

### 🔄 API PARADIGMS

47. REST: all core APIs
48. Add second paradigm:
   - GraphQL OR
   - WebSockets (e.g., for real-time updates)

---

### 📦 DEPLOYMENT (optional)

49. Add Dockerfiles for all services
50. Use Docker Compose to orchestrate services

---

### 🧑‍🏫 PRESENTATION PREP

51. Build a live demo with:
   - Frontend UI
   - Login/auth flow
   - API call with/without JWT
   - Interaction with microservices
52. Prepare slides showing:
   - Tech stack
   - System architecture diagram
   - APIs and paradigms used
   - Databases and services

---

