import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import Redis from 'ioredis';
import { Server as SocketIOServer } from 'socket.io';
import { createServer } from 'http';

dotenv.config();

console.log('🔥 STARTING - Microservice-2 (notifications)...');
console.log('✅ Basic imports loaded');

const app = express();
const PORT = process.env.PORT || 4002;
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

console.log('🧪 Setting up Express middleware...');
app.use(cors());
app.use(express.json());
console.log('✅ Express middleware configured');

console.log('🧪 Connecting to Redis...');
console.log('📍 Redis URL:', REDIS_URL);

const redis = new Redis(REDIS_URL);

// Create HTTP server
const server = createServer(app);

// Create WebSocket server
const io = new SocketIOServer(server, {
  cors: {
    origin: "*", // In production, specify your frontend URL
    methods: ["GET", "POST"]
  }
});

// Redis connection events
redis.on('connect', () => {
  console.log('✅ Connected to Redis');
  console.log('🎉 REDIS CONNECTION SUCCESSFUL!');
});

redis.on('error', (err) => {
  console.error('❌ Redis connection error:', err);
});

// Constants
const NOTIFICATIONS_KEY = 'notifications';
const USER_NOTIFICATIONS_KEY = 'user_notifications:';
const NOTIFICATION_STATS_KEY = 'notification_stats';

// Helper function to get user-specific notifications key
const getUserNotificationsKey = (userId: string) => `${USER_NOTIFICATIONS_KEY}${userId}`;

// WebSocket connection handling
io.on('connection', (socket) => {
  console.log(`🔌 WebSocket client connected: ${socket.id}`);

  // Client can join a room for their user ID
  socket.on('join-user-room', (userId) => {
    socket.join(`user_${userId}`);
    console.log(`👤 User ${userId} joined their notification room`);
    
    // Send welcome message via WebSocket
    socket.emit('notification', {
      type: 'system',
      title: 'WebSocket Connected',
      message: 'Real-time notifications are now active!',
      timestamp: new Date().toISOString()
    });
  });

  // Handle client disconnect
  socket.on('disconnect', () => {
    console.log(`🔌 WebSocket client disconnected: ${socket.id}`);
  });

  // Handle ping from client
  socket.on('ping', () => {
    socket.emit('pong', { 
      message: 'WebSocket is working!',
      timestamp: new Date().toISOString() 
    });
  });

  // Send initial connection stats
  socket.emit('stats', {
    connected_clients: io.engine.clientsCount,
    server_time: new Date().toISOString(),
    websocket_status: 'connected'
  });
});

// Routes

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ 
    status: 'OK', 
    service: 'microservice-2-notifications',
    timestamp: new Date().toISOString(),
    redis_status: redis.status,
    websocket_enabled: true,
    connected_clients: io.engine.clientsCount
  });
});

// Send notification (enhanced with WebSocket)
app.post('/notifications/send', async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, type, title, message, priority = 'normal' } = req.body;
    
    if (!userId || !type || !message) {
      res.status(400).json({ error: 'userId, type, and message are required' });
      return;
    }

    const notification = {
      id: Date.now().toString(),
      userId,
      type,
      title: title || 'Notification',
      message,
      priority,
      timestamp: new Date().toISOString(),
      read: false
    };

    // Store in Redis (REST API functionality)
    await redis.lpush(NOTIFICATIONS_KEY, JSON.stringify(notification));
    await redis.ltrim(NOTIFICATIONS_KEY, 0, 99); // Keep last 100

    // Store in user-specific notifications
    const userKey = getUserNotificationsKey(userId);
    await redis.lpush(userKey, JSON.stringify(notification));
    await redis.ltrim(userKey, 0, 49); // Keep last 50 per user
    await redis.expire(userKey, 7 * 24 * 60 * 60); // Expire after 7 days

    // Update notification stats
    await redis.hincrby(NOTIFICATION_STATS_KEY, 'total_sent', 1);
    await redis.hincrby(NOTIFICATION_STATS_KEY, `type_${type}`, 1);
    await redis.hincrby(NOTIFICATION_STATS_KEY, `priority_${priority}`, 1);

    // 🚀 NEW: Send real-time notification via WebSocket
    io.to(`user_${userId}`).emit('notification', {
      id: notification.id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      priority: notification.priority,
      timestamp: notification.timestamp,
      realtime: true
    });

    // Also broadcast to all connected clients for demo purposes
    io.emit('global-notification', {
      message: `New ${type} notification sent to user ${userId}`,
      timestamp: notification.timestamp,
      total_clients: io.engine.clientsCount
    });

    console.log(`📧 Notification sent to user ${userId}: ${message}`);
    console.log(`📡 Real-time notification broadcasted via WebSocket`);
    
    res.json({ 
      message: 'Notification sent successfully (REST + WebSocket)', 
      notification: {
        id: notification.id,
        userId,
        type,
        title: notification.title,
        message,
        timestamp: notification.timestamp
      },
      websocket_broadcasted: true,
      connected_clients: io.engine.clientsCount
    });

  } catch (error: any) {
    console.error('Notification send error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get recent notifications (REST API)
app.get('/notifications/recent', async (req: Request, res: Response): Promise<void> => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const notifications = await redis.lrange(NOTIFICATIONS_KEY, 0, limit - 1);
    const parsed = notifications.map(n => JSON.parse(n));
    
    res.json({ 
      notifications: parsed,
      count: parsed.length,
      total_in_system: await redis.llen(NOTIFICATIONS_KEY),
      api_type: 'REST'
    });

  } catch (error: any) {
    console.error('Get recent notifications error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get user-specific notifications (REST API)
app.get('/notifications/user/:userId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit as string) || 20;
    
    const userKey = getUserNotificationsKey(userId);
    const notifications = await redis.lrange(userKey, 0, limit - 1);
    const parsed = notifications.map(n => JSON.parse(n));
    
    res.json({ 
      userId,
      notifications: parsed,
      count: parsed.length,
      unread_count: parsed.filter(n => !n.read).length,
      api_type: 'REST'
    });

  } catch (error: any) {
    console.error('Get user notifications error:', error);
    res.status(500).json({ error: error.message });
  }
});

// WebSocket status endpoint
app.get('/websocket/status', (req: Request, res: Response) => {
  res.json({
    websocket_server: 'active',
    connected_clients: io.engine.clientsCount,
    rooms: Array.from(io.sockets.adapter.rooms.keys()),
    timestamp: new Date().toISOString(),
    supported_events: ['join-user-room', 'notification', 'global-notification', 'ping', 'pong']
  });
});

// WebSocket test endpoint
app.post('/websocket/test', (req: Request, res: Response) => {
  const { message = 'WebSocket test message' } = req.body;
  
  // Broadcast test message to all connected clients
  io.emit('test-message', {
    message,
    timestamp: new Date().toISOString(),
    sent_by: 'REST API',
    clients_reached: io.engine.clientsCount
  });

  res.json({
    message: 'WebSocket test message sent',
    clients_reached: io.engine.clientsCount,
    timestamp: new Date().toISOString()
  });
});

// Bulk send notifications with WebSocket broadcast
app.post('/notifications/bulk-send', async (req: Request, res: Response): Promise<void> => {
  try {
    const { notifications } = req.body;
    
    if (!Array.isArray(notifications)) {
      res.status(400).json({ error: 'notifications must be an array' });
      return;
    }

    const results = [];
    
    for (const notif of notifications) {
      const { userId, type, title, message, priority = 'normal' } = notif;
      
      if (!userId || !type || !message) {
        results.push({ error: 'Missing required fields', notification: notif });
        continue;
      }

      const notification = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        userId,
        type,
        title: title || 'Notification',
        message,
        priority,
        timestamp: new Date().toISOString(),
        read: false
      };

      // Store notifications in Redis
      await redis.lpush(NOTIFICATIONS_KEY, JSON.stringify(notification));
      const userKey = getUserNotificationsKey(userId);
      await redis.lpush(userKey, JSON.stringify(notification));
      await redis.expire(userKey, 7 * 24 * 60 * 60);

      // Send via WebSocket
      io.to(`user_${userId}`).emit('notification', notification);

      // Update stats
      await redis.hincrby(NOTIFICATION_STATS_KEY, 'total_sent', 1);
      await redis.hincrby(NOTIFICATION_STATS_KEY, `type_${type}`, 1);

      results.push({ success: true, id: notification.id });
    }

    // Trim lists to prevent memory issues
    await redis.ltrim(NOTIFICATIONS_KEY, 0, 999);

    // Broadcast bulk operation completion
    io.emit('bulk-operation-complete', {
      total_sent: results.filter(r => r.success).length,
      timestamp: new Date().toISOString()
    });

    res.json({ 
      message: 'Bulk notifications processed (REST + WebSocket)',
      results,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => r.error).length,
      websocket_broadcasted: true
    });

  } catch (error: any) {
    console.error('Bulk send notifications error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get notification statistics
app.get('/notifications/stats', async (req: Request, res: Response): Promise<void> => {
  try {
    const stats = await redis.hgetall(NOTIFICATION_STATS_KEY);
    const totalNotifications = await redis.llen(NOTIFICATIONS_KEY);
    
    res.json({
      total_notifications_in_system: totalNotifications,
      statistics: stats,
      websocket_info: {
        status: 'active',
        connected_clients: io.engine.clientsCount,
        rooms: Array.from(io.sockets.adapter.rooms.keys()).length
      },
      redis_info: {
        status: redis.status,
        redis_memory_info: 'Memory usage tracking available'
      },
      api_paradigms: ['REST', 'WebSocket']
    });

  } catch (error: any) {
    console.error('Get notification stats error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Error handling middleware
app.use((err: any, req: Request, res: Response, next: any) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Graceful shutdown
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('SIGTERM', async () => {
  console.log('🛑 SIGTERM received, shutting down gracefully...');
  await redis.disconnect();
  process.exit(0);
});

console.log('🧪 Starting server...');
server.listen(PORT, () => {
  console.log('🎉 NOTIFICATIONS MICROSERVICE IS RUNNING!');
  console.log(`📍 HTTP Server: http://localhost:${PORT}`);
  console.log(`🔌 WebSocket Server: ws://localhost:${PORT}`);
  console.log('🔗 Available REST endpoints:');
  console.log('  GET  /health - Health check');
  console.log('  POST /notifications/send - Send notification (REST + WebSocket)');
  console.log('  GET  /notifications/recent - Get recent notifications');
  console.log('  GET  /notifications/user/:userId - Get user notifications');
  console.log('  GET  /notifications/stats - Get statistics');
  console.log('  GET  /websocket/status - WebSocket server status');
  console.log('  POST /websocket/test - Test WebSocket broadcast');
  console.log('  POST /notifications/bulk-send - Bulk send notifications');
  console.log('');
  console.log('🔌 WebSocket Events:');
  console.log('  join-user-room - Join user-specific room');
  console.log('  notification - Receive real-time notifications');
  console.log('  global-notification - Receive global notifications');
  console.log('  ping/pong - Connection health check');
  console.log('  test-message - Test WebSocket functionality');
});

console.log('🏁 Notifications microservice setup complete!');