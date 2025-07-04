import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

console.log('Starting microservice-1 (analytics)...');

const app = express();
const PORT = process.env.PORT || 4001;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/analytics_db';

app.use(cors());
app.use(express.json());

// Mongoose model for activity logs
const activitySchema = new mongoose.Schema({
  type: String,
  userId: String,
  timestamp: { type: Date, default: Date.now },
  details: mongoose.Schema.Types.Mixed,
});
const Activity = mongoose.model('Activity', activitySchema);

mongoose.connect(MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('MongoDB connection error:', err));

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

app.post('/analytics/track', async (req: Request, res: Response) => {
  try {
    const activity = new Activity(req.body);
    await activity.save();
    res.json({ message: 'Activity tracked', activity });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Analytics microservice running on port ${PORT}`);
}); 