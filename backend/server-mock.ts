import 'dotenv/config';
import express, { Application, Request, Response, NextFunction } from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';

// Import routes
import authRoutes from './routes/auth';
import shopRoutes from './routes/shops';
import productRoutes from './routes/products';
import conversationRoutes from './routes/conversations';
import orderRoutes from './routes/orders';
import formRoutes from './routes/forms';
import integrationRoutes from './routes/integrations';
import paymentRoutes from './routes/payments';
import notificationRoutes from './routes/notifications';
import oauthRoutes from './routes/oauth';
import webhookRoutes from './routes/webhooks';

// Create Express app
const app: Application = express();
const server = http.createServer(app);

// ============================================
// MIDDLEWARE
// ============================================

// Security headers
app.use(helmet());

// CORS configuration
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
}));

// Compression
app.use(compression());

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ============================================
// ROUTES REGISTRATION
// ============================================

app.use('/api/auth', authRoutes);
app.use('/api/shops', shopRoutes);
app.use('/api/shops/:shopId/products', productRoutes);
app.use('/api/shops/:shopId/conversations', conversationRoutes);
app.use('/api/shops/:shopId/orders', orderRoutes);
app.use('/api/shops/:shopId/forms', formRoutes);
app.use('/api/shops/:shopId/integrations', integrationRoutes);
app.use('/api/shops/:shopId/payments', paymentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/oauth', oauthRoutes);
app.use('/webhook', webhookRoutes);

app.get('/health', (req: Request, res: Response) => {
    res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
    });
});

// 404 handler
app.use((req: Request, res: Response) => {
    res.status(404).json({
        success: false,
        error: 'Route not found',
    });
});

// Error handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    console.error('Error:', err);
    
    res.status(err.status || 500).json({
        success: false,
        error: err.message || 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
});

// ============================================
// EXPORTS
// ============================================

if (require.main === module) {
    const PORT = process.env.PORT || 8080;
    
    server.listen(PORT, () => {
        console.log(`Mock server running on port ${PORT}`);
    });
}

export { app, server };
