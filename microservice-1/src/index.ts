import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

console.log('🔥 STARTING - Microservice-1 (analytics)...');
console.log('✅ Basic imports loaded');

const app = express();
const PORT = process.env.PORT || 4001;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/analytics_db';

console.log('🧪 Setting up Express middleware...');
app.use(cors());
app.use(express.json());
console.log('✅ Express middleware configured');

// Mongoose model for activity logs
const activitySchema = new mongoose.Schema({
  type: String,
  userId: String,
  timestamp: { type: Date, default: Date.now },
  details: mongoose.Schema.Types.Mixed,
});
const Activity = mongoose.model('Activity', activitySchema);

console.log('🧪 Attempting MongoDB connection...');
console.log('📍 MongoDB URI:', MONGODB_URI);

mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('✅ Connected to MongoDB');
    console.log('🎉 DATABASE CONNECTION SUCCESSFUL!');
  })
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err);
    console.log('⚠️  Continuing without database...');
  });

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

console.log('🧪 Starting server...');
// Add this health endpoint to microservice-1
app.get('/health', (req: Request, res: Response) => {
  res.json({ 
    status: 'OK', 
    service: 'microservice-1-analytics',
    timestamp: new Date().toISOString(),
    mongodb_status: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});
app.listen(PORT, () => {
  console.log('🎉 ANALYTICS MICROSERVICE IS RUNNING!');
  console.log(`📍 http://localhost:${PORT}`);
});