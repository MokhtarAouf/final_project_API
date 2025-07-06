import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import axios from 'axios';

dotenv.config();

console.log('🔥 STARTING - Main Backend Server');

const app = express();
const PORT = process.env.PORT || 4000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/main_db';
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const MICROSERVICE_1_URL = process.env.MICROSERVICE_1_URL || 'http://localhost:4001';
const MICROSERVICE_2_URL = process.env.MICROSERVICE_2_URL || 'http://localhost:4002';

// Google OAuth client
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

// Middleware
app.use(cors());
app.use(express.json());

// Extend Request interface
interface AuthenticatedRequest extends Request {
  user?: any;
}

// User schema
const userSchema = new mongoose.Schema({
  googleId: String,
  email: String,
  name: String,
  picture: String,
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

// Connect to MongoDB
mongoose.connect(MONGODB_URI)
  .then(() => console.log('✅ Connected to Main Database'))
  .catch(err => console.error('❌ Database connection error:', err));

// JWT Authentication Middleware
const authenticateToken = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({ error: 'Access token required' });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.user = decoded;
    next();
  } catch (error) {
    res.status(403).json({ error: 'Invalid token' });
    return;
  }
};

// Helper function to call microservices
const callMicroservice = async (url: string, data: any) => {
  try {
    const response = await axios.post(url, data, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 5000 // 5 second timeout
    });
    return response.data;
  } catch (error: any) {
    console.error('Microservice call failed:', error.message);
    throw error;
  }
};

// Routes

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ 
    status: 'OK', 
    service: 'backend-main',
    timestamp: new Date().toISOString(),
    microservices: {
      analytics: MICROSERVICE_1_URL,
      notifications: MICROSERVICE_2_URL
    }
  });
});

// Google OAuth Authentication
app.post('/auth/google', async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.body;
    
    if (!token) {
      res.status(400).json({ error: 'Google token is required' });
      return;
    }

    // Verify Google token
    const ticket = await googleClient.verifyIdToken({
      idToken: token,
      audience: GOOGLE_CLIENT_ID,
    });
    
    const payload = ticket.getPayload();
    if (!payload) {
      res.status(400).json({ error: 'Invalid Google token' });
      return;
    }

    // Find or create user
    let user = await User.findOne({ googleId: payload.sub });
    if (!user) {
      user = new User({
        googleId: payload.sub,
        email: payload.email,
        name: payload.name,
        picture: payload.picture,
      });
      await user.save();
      
      // Send welcome notification for new users
      try {
        await callMicroservice(`${MICROSERVICE_2_URL}/notifications/send`, {
          userId: user._id.toString(),
          type: 'welcome',
          title: 'Welcome!',
          message: `Welcome to our platform, ${user.name}!`,
          priority: 'high'
        });
      } catch (error) {
        console.warn('Failed to send welcome notification');
      }
    }

    // Generate JWT
    const jwtToken = jwt.sign(
      { 
        userId: user._id, 
        email: user.email,
        name: user.name 
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Track login in analytics microservice
    try {
      await callMicroservice(`${MICROSERVICE_1_URL}/analytics/track`, {
        type: 'user_login',
        userId: user._id.toString(),
        details: { 
          email: user.email, 
          loginMethod: 'google',
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.warn('Failed to track login analytics');
    }

    // Send login notification
    try {
      await callMicroservice(`${MICROSERVICE_2_URL}/notifications/send`, {
        userId: user._id.toString(),
        type: 'login',
        title: 'Login Successful',
        message: `Welcome back, ${user.name}!`,
        priority: 'normal'
      });
    } catch (error) {
      console.warn('Failed to send login notification');
    }

    res.json({
      token: jwtToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        picture: user.picture
      }
    });

  } catch (error) {
    console.error('Google auth error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

// Protected route example
app.get('/api/profile', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.user?.userId);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Track profile access
    try {
      await callMicroservice(`${MICROSERVICE_1_URL}/analytics/track`, {
        type: 'profile_access',
        userId: user._id.toString(),
        details: { timestamp: new Date().toISOString() }
      });
    } catch (error) {
      console.warn('Failed to track profile access');
    }

    res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      picture: user.picture,
      createdAt: user.createdAt
    });

  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// API endpoint that uses both microservices
app.post('/api/user-action', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { action, data } = req.body;

    if (!action) {
      res.status(400).json({ error: 'Action is required' });
      return;
    }

    // Process the main business logic here
    const result = {
      action,
      data,
      userId: req.user?.userId,
      timestamp: new Date().toISOString(),
      status: 'processed'
    };

    // Call analytics microservice to track the action
    try {
      await callMicroservice(`${MICROSERVICE_1_URL}/analytics/track`, {
        type: 'user_action',
        userId: req.user?.userId,
        details: { action, data, timestamp: new Date().toISOString() }
      });
    } catch (error) {
      console.warn('Failed to track user action');
    }

    // Call microservice-2 to send a notification
    try {
      await callMicroservice(`${MICROSERVICE_2_URL}/notifications/send`, {
        userId: req.user?.userId,
        type: 'user_action',
        title: 'Action Completed',
        message: `User performed action: ${action}`,
        priority: 'normal'
      });
    } catch (error) {
      console.warn('Failed to send notification via microservice-2');
    }

    res.json(result);

  } catch (error) {
    console.error('User action error:', error);
    res.status(500).json({ error: 'Failed to process action' });
  }
});

// Get user notifications
app.get('/api/notifications', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const limit = req.query.limit || '10';

    // Get notifications from microservice-2
    const response = await axios.get(`${MICROSERVICE_2_URL}/notifications/user/${userId}?limit=${limit}`);
    
    // Track notification access
    try {
      await callMicroservice(`${MICROSERVICE_1_URL}/analytics/track`, {
        type: 'notifications_accessed',
        userId,
        details: { count: response.data.count, timestamp: new Date().toISOString() }
      });
    } catch (error) {
      console.warn('Failed to track notification access');
    }

    res.json(response.data);

  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// Mark notification as read
app.put('/api/notifications/:notificationId/read', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { notificationId } = req.params;
    const userId = req.user?.userId;

    const response = await axios.put(`${MICROSERVICE_2_URL}/notifications/${notificationId}/read`, {
      userId
    });

    // Track notification read
    try {
      await callMicroservice(`${MICROSERVICE_1_URL}/analytics/track`, {
        type: 'notification_read',
        userId,
        details: { notificationId, timestamp: new Date().toISOString() }
      });
    } catch (error) {
      console.warn('Failed to track notification read');
    }

    res.json(response.data);

  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

// External API endpoint (for third-party access)
app.get('/api/external/stats', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    // This is your external API that requires JWT
    // You can call this from Postman with a JWT token
    
    const totalUsers = await User.countDocuments();
    
    // Get analytics stats
    let analyticsStats = {};
    try {
      // If your analytics microservice has a stats endpoint, call it
      // const analyticsResponse = await axios.get(`${MICROSERVICE_1_URL}/analytics/stats`);
      // analyticsStats = analyticsResponse.data;
    } catch (error) {
      console.warn('Failed to get analytics stats');
    }

    // Get notification stats
    let notificationStats = {};
    try {
      const notifResponse = await axios.get(`${MICROSERVICE_2_URL}/notifications/stats`);
      notificationStats = notifResponse.data;
    } catch (error) {
      console.warn('Failed to get notification stats');
    }

    const stats = {
      totalUsers,
      analytics: analyticsStats,
      notifications: notificationStats,
      timestamp: new Date().toISOString(),
      requestedBy: req.user?.email
    };

    // Track API access
    try {
      await callMicroservice(`${MICROSERVICE_1_URL}/analytics/track`, {
        type: 'external_api_access',
        userId: req.user?.userId,
        details: { endpoint: '/api/external/stats', timestamp: new Date().toISOString() }
      });
    } catch (error) {
      console.warn('Failed to track external API access');
    }

    res.json(stats);

  } catch (error) {
    console.error('External API error:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// Public API endpoint (no authentication) - for comparison
app.get('/api/public/health', (req: Request, res: Response) => {
  res.json({ 
    status: 'public', 
    message: 'This endpoint does not require authentication',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Dashboard endpoint - aggregates data from both microservices
app.get('/api/dashboard', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;

    // Get user notifications
    let notifications = [];
    try {
      const notifResponse = await axios.get(`${MICROSERVICE_2_URL}/notifications/user/${userId}?limit=5`);
      notifications = notifResponse.data.notifications;
    } catch (error) {
      console.warn('Failed to get user notifications for dashboard');
    }

    // Get user info
    const user = await User.findById(userId);

    const dashboardData = {
      user: {
        id: user?._id,
        name: user?.name,
        email: user?.email,
        picture: user?.picture,
        memberSince: user?.createdAt
      },
      recentNotifications: notifications,
      stats: {
        totalNotifications: notifications.length,
        unreadNotifications: notifications.filter((n: any) => !n.read).length
      },
      timestamp: new Date().toISOString()
    };

    // Track dashboard access
    try {
      await callMicroservice(`${MICROSERVICE_1_URL}/analytics/track`, {
        type: 'dashboard_access',
        userId,
        details: { timestamp: new Date().toISOString() }
      });
    } catch (error) {
      console.warn('Failed to track dashboard access');
    }

    res.json(dashboardData);

  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: 'Failed to load dashboard' });
  }
});

// Test microservices connectivity
app.get('/api/test/microservices', async (req: Request, res: Response): Promise<void> => {
  const results = {
    timestamp: new Date().toISOString(),
    microservice1: { status: 'unknown', url: MICROSERVICE_1_URL },
    microservice2: { status: 'unknown', url: MICROSERVICE_2_URL }
  };

  // Test microservice 1
  try {
    const response1 = await axios.get(`${MICROSERVICE_1_URL}/health`, { timeout: 3000 });
    results.microservice1.status = response1.data.status || 'OK';
  } catch (error) {
    results.microservice1.status = 'ERROR';
  }

  // Test microservice 2
  try {
    const response2 = await axios.get(`${MICROSERVICE_2_URL}/health`, { timeout: 3000 });
    results.microservice2.status = response2.data.status || 'OK';
  } catch (error) {
    results.microservice2.status = 'ERROR';
  }

  res.json(results);
});

// Error handling middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log('🎉 MAIN BACKEND SERVER IS RUNNING!');
  console.log(`📍 http://localhost:${PORT}`);
  console.log('🔗 Available endpoints:');
  console.log('  GET  /health - Health check');
  console.log('  POST /auth/google - Google OAuth login');
  console.log('  GET  /api/profile - User profile (protected)');
  console.log('  POST /api/user-action - User actions (protected)');
  console.log('  GET  /api/notifications - Get user notifications (protected)');
  console.log('  PUT  /api/notifications/:id/read - Mark notification as read (protected)');
  console.log('  GET  /api/dashboard - User dashboard (protected)');
  console.log('  GET  /api/external/stats - External API (protected)');
  console.log('  GET  /api/public/health - Public endpoint');
  console.log('  GET  /api/test/microservices - Test microservices connectivity');
  console.log('');
  console.log('🔗 Microservices:');
  console.log(`  Analytics: ${MICROSERVICE_1_URL}`);
  console.log(`  Notifications: ${MICROSERVICE_2_URL}`);
});

console.log('✅ Main backend setup complete');