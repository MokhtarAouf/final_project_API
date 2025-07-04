console.log('Starting microservice-2 (notifications)...');

import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import Redis from 'ioredis';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4002;
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

app.use(cors());
app.use(express.json());

const redis = new Redis(REDIS_URL);
const NOTIFICATIONS_KEY = 'notifications';

app.post('/notifications/send', async (req: Request, res: Response) => {
  try {
    const notification = req.body;
    // Store notification as a JSON string in a Redis list
    await redis.lpush(NOTIFICATIONS_KEY, JSON.stringify(notification));
    // Optionally trim the list to keep only the most recent N notifications
    await redis.ltrim(NOTIFICATIONS_KEY, 0, 49); // Keep last 50
    res.json({ message: 'Notification sent', notification });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/notifications/recent', async (req: Request, res: Response) => {
  try {
    const notifications = await redis.lrange(NOTIFICATIONS_KEY, 0, 49);
    const parsed = notifications.map((n) => JSON.parse(n));
    res.json({ notifications: parsed });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Notifications microservice running on port ${PORT}`);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
}); 