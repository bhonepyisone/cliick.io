require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');

// Create Express app FIRST
const app = express();
const server = http.createServer(app);

// ============================================
// MIDDLEWARE - MUST be before routes
// ============================================

// Security headers
app.use(helmet());

// CORS configuration - allow both local and production URLs
app.use(cors({
    origin: function(origin, callback) {
        // Allow localhost development
        if (!origin || 
            origin.startsWith('http://localhost') || 
            origin.startsWith('http://127.0.0.1') ||
            origin === (process.env.FRONTEND_URL || 'https://cliickio.vercel.app') ||
            origin.endsWith('.vercel.app')) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Compression
app.use(compression());

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Cookie parsing
app.use(cookieParser());

// Logging
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
} else {
    app.use(morgan('combined'));
}

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
});
app.use('/api/', limiter);

console.log('✅ Middleware configured');

// Simple health check endpoint - MUST work immediately
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        env: process.env.NODE_ENV,
        port: process.env.PORT || 8080,
        supabaseUrl: process.env.SUPABASE_URL ? 'configured' : 'MISSING',
        supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'configured' : 'MISSING',
    });
});

console.log('✅ Health check endpoint registered');

try {
    // Import routes
    const authRoutes = require('./routes/auth').default || require('./routes/auth');
    const shopRoutes = require('./routes/shops').default || require('./routes/shops');
    const productRoutes = require('./routes/products').default || require('./routes/products');
    const conversationRoutes = require('./routes/conversations').default || require('./routes/conversations');
    const orderRoutes = require('./routes/orders').default || require('./routes/orders');
    const formRoutes = require('./routes/forms').default || require('./routes/forms');
    const analyticsRoutes = require('./routes/analytics').default || require('./routes/analytics');
    const integrationRoutes = require('./routes/integrations').default || require('./routes/integrations');
    const paymentRoutes = require('./routes/payments').default || require('./routes/payments');
    const notificationRoutes = require('./routes/notifications').default || require('./routes/notifications');
    const uploadRoutes = require('./routes/uploads').default || require('./routes/uploads');
    const oauthRoutes = require('./routes/oauth').default || require('./routes/oauth');
    const webhookRoutes = require('./routes/webhooks').default || require('./routes/webhooks');
    const adminRoutes = require('./routes/admin').default || require('./routes/admin');
    
    console.log('✅ All routes imported successfully');

    // Import WebSocket handler
    const setupWebSocket = require('./websocket');
    const { initializeWebSocketEmitter } = require('./utils/websocketEmitter');
    
    console.log('✅ WebSocket handlers imported');

    // Create Socket.io instance
    const io = socketIo(server, {
        cors: {
            origin: function(origin, callback) {
                const allowedOrigins = [
                    'http://localhost:3000',
                    'http://localhost:5173',
                    'http://127.0.0.1:3000',
                    'http://127.0.0.1:5173',
                    process.env.FRONTEND_URL || 'https://cliickio.vercel.app'
                ];
                
                if (!origin || allowedOrigins.includes(origin)) {
                    callback(null, true);
                } else {
                    callback(new Error('Not allowed by CORS'));
                }
            },
            credentials: true,
        },
    });
    
    console.log('✅ Socket.io initialized');

    // ============================================
    // ROUTES
    // ============================================

    app.use('/api/auth', authRoutes);
    app.use('/api/shops', shopRoutes);
    app.use('/api/shops/:shopId/products', productRoutes);
    app.use('/api/shops/:shopId/conversations', conversationRoutes);
    app.use('/api/shops/:shopId/orders', orderRoutes);
    app.use('/api/shops/:shopId/forms', formRoutes);
    app.use('/api/shops/:shopId/analytics', analyticsRoutes);
    app.use('/api/shops/:shopId/integrations', integrationRoutes);
    app.use('/api/shops/:shopId/payments', paymentRoutes);
    app.use('/api/shops/:shopId/notifications', notificationRoutes);
    app.use('/api/shops/:shopId/uploads', uploadRoutes);
    app.use('/api/notifications', notificationRoutes);
    app.use('/oauth', oauthRoutes);
    app.use('/webhook', webhookRoutes);
    app.use('/api/admin', adminRoutes);
    
    console.log('✅ All routes registered');

    // 404 handler
    app.use((req, res) => {
        res.status(404).json({
            success: false,
            error: 'Route not found',
        });
    });

    // Error handler
    app.use((err, req, res, next) => {
        console.error('Error:', err);
        
        res.status(err.status || 500).json({
            success: false,
            error: err.message || 'Internal server error',
            ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
        });
    });
    
    console.log('✅ Error handlers configured');

    // ============================================
    // WEBSOCKET SETUP
    // ============================================

    try {
        setupWebSocket(io);
        initializeWebSocketEmitter(io);
    } catch (wsError) {
        console.warn('⚠️  WebSocket setup warning:', wsError.message);
    }
    
    console.log('✅ WebSocket setup complete');

} catch (importError) {
    console.error('❌ Error during initialization:', importError.message);
    console.error(importError.stack);
    // Continue anyway - routes might not be available but health check should work
}

// ============================================
// START SERVER
// ============================================

const PORT = process.env.PORT || 8080;

server.listen(PORT, '0.0.0.0', () => {
    console.log(`
    ╔═══════════════════════════════════════╗
    ║   Cliick.io Backend Server Running   ║
    ╚═══════════════════════════════════════╝
    
    🚀 Server:      http://0.0.0.0:${PORT}
    🌐 API:         http://0.0.0.0:${PORT}/api
    ⚡ WebSocket:   ws://0.0.0.0:${PORT}
    📊 Health:      http://0.0.0.0:${PORT}/health
    
    Environment:   ${process.env.NODE_ENV || 'development'}
    `);
});

server.on('error', (err) => {
    console.error('Server error:', err);
    process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    server.close(() => {
        console.log('HTTP server closed');
        process.exit(0);
    });
});

process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    process.exit(1);
});

module.exports = { app, server };
