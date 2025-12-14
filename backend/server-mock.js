"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.server = exports.app = void 0;
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
// Import routes
const auth_1 = __importDefault(require("./routes/auth"));
const shops_1 = __importDefault(require("./routes/shops"));
const products_1 = __importDefault(require("./routes/products"));
const conversations_1 = __importDefault(require("./routes/conversations"));
const orders_1 = __importDefault(require("./routes/orders"));
const forms_1 = __importDefault(require("./routes/forms"));
const integrations_1 = __importDefault(require("./routes/integrations"));
const payments_1 = __importDefault(require("./routes/payments"));
const notifications_1 = __importDefault(require("./routes/notifications"));
const oauth_1 = __importDefault(require("./routes/oauth"));
const webhooks_1 = __importDefault(require("./routes/webhooks"));
// Create Express app
const app = (0, express_1.default)();
exports.app = app;
const server = http_1.default.createServer(app);
exports.server = server;
// ============================================
// MIDDLEWARE
// ============================================
// Security headers
app.use((0, helmet_1.default)());
// CORS configuration
app.use((0, cors_1.default)({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
}));
// Compression
app.use((0, compression_1.default)());
// Body parsing
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
// ============================================
// ROUTES REGISTRATION
// ============================================
app.use('/api/auth', auth_1.default);
app.use('/api/shops', shops_1.default);
app.use('/api/shops/:shopId/products', products_1.default);
app.use('/api/shops/:shopId/conversations', conversations_1.default);
app.use('/api/shops/:shopId/orders', orders_1.default);
app.use('/api/shops/:shopId/forms', forms_1.default);
app.use('/api/shops/:shopId/integrations', integrations_1.default);
app.use('/api/shops/:shopId/payments', payments_1.default);
app.use('/api/notifications', notifications_1.default);
app.use('/oauth', oauth_1.default);
app.use('/webhook', webhooks_1.default);
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
    });
});
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
// ============================================
// EXPORTS
// ============================================
if (require.main === module) {
    const PORT = process.env.PORT || 8080;
    server.listen(PORT, () => {
        console.log(`Mock server running on port ${PORT}`);
    });
}
