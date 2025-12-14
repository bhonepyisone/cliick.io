"use strict";
/**
 * Client-Side Rate Limiting Utility
 * Prevents API abuse and provides user feedback
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.RATE_LIMITS = exports.rateLimiter = void 0;
exports.withRateLimit = withRateLimit;
exports.createUserRateLimiter = createUserRateLimiter;
class RateLimiter {
    constructor() {
        this.limits = new Map();
    }
    /**
     * Check if action is allowed under rate limit
     * @param key Unique identifier for the action (e.g., 'login:user@email.com', 'api:shops')
     * @param config Rate limit configuration
     * @returns Object with allowed status and remaining attempts
     */
    check(key, config) {
        const now = Date.now();
        const entry = this.limits.get(key);
        // No previous entry or window expired - allow and create new entry
        if (!entry || now > entry.resetTime) {
            this.limits.set(key, {
                count: 1,
                resetTime: now + config.windowMs,
            });
            return {
                allowed: true,
                remaining: config.maxRequests - 1,
                resetIn: config.windowMs,
            };
        }
        // Within window - check if under limit
        if (entry.count < config.maxRequests) {
            entry.count++;
            return {
                allowed: true,
                remaining: config.maxRequests - entry.count,
                resetIn: entry.resetTime - now,
            };
        }
        // Over limit
        return {
            allowed: false,
            remaining: 0,
            resetIn: entry.resetTime - now,
            message: config.message || `Rate limit exceeded. Try again in ${Math.ceil((entry.resetTime - now) / 1000)}s`,
        };
    }
    /**
     * Reset rate limit for a specific key
     */
    reset(key) {
        this.limits.delete(key);
    }
    /**
     * Clear all rate limits
     */
    clearAll() {
        this.limits.clear();
    }
    /**
     * Clean up expired entries (run periodically)
     */
    cleanup() {
        const now = Date.now();
        for (const [key, entry] of this.limits.entries()) {
            if (now > entry.resetTime) {
                this.limits.delete(key);
            }
        }
    }
}
// Singleton instance
exports.rateLimiter = new RateLimiter();
// Cleanup expired entries every minute
setInterval(() => exports.rateLimiter.cleanup(), 60000);
// ============================================
// PREDEFINED RATE LIMIT CONFIGS
// ============================================
exports.RATE_LIMITS = {
    // Authentication
    LOGIN: {
        maxRequests: 5,
        windowMs: 15 * 60 * 1000, // 15 minutes
        message: 'Too many login attempts. Please try again in 15 minutes.',
    },
    SIGNUP: {
        maxRequests: 3,
        windowMs: 60 * 60 * 1000, // 1 hour
        message: 'Too many signup attempts. Please try again in 1 hour.',
    },
    PASSWORD_RESET: {
        maxRequests: 3,
        windowMs: 60 * 60 * 1000, // 1 hour
        message: 'Too many password reset requests. Please try again in 1 hour.',
    },
    // API Calls
    API_GENERAL: {
        maxRequests: 100,
        windowMs: 15 * 60 * 1000, // 100 requests per 15 minutes
        message: 'API rate limit exceeded. Please slow down.',
    },
    API_CREATE: {
        maxRequests: 10,
        windowMs: 60 * 1000, // 10 creates per minute
        message: 'Too many create operations. Please wait a moment.',
    },
    API_UPDATE: {
        maxRequests: 30,
        windowMs: 60 * 1000, // 30 updates per minute
        message: 'Too many update operations. Please wait a moment.',
    },
    API_DELETE: {
        maxRequests: 5,
        windowMs: 60 * 1000, // 5 deletes per minute
        message: 'Too many delete operations. Please wait a moment.',
    },
    // File Uploads
    FILE_UPLOAD: {
        maxRequests: 10,
        windowMs: 60 * 1000, // 10 uploads per minute
        message: 'Too many file uploads. Please wait a moment.',
    },
    IMAGE_UPLOAD: {
        maxRequests: 20,
        windowMs: 5 * 60 * 1000, // 20 images per 5 minutes
        message: 'Too many image uploads. Please wait before uploading more images.',
    },
    // Chat/Messaging
    MESSAGE_SEND: {
        maxRequests: 20,
        windowMs: 60 * 1000, // 20 messages per minute
        message: 'You are sending messages too quickly. Please slow down.',
    },
    // AI Features
    AI_GENERATION: {
        maxRequests: 10,
        windowMs: 60 * 1000, // 10 AI requests per minute
        message: 'Too many AI requests. Please wait a moment.',
    },
    AI_DESCRIPTION: {
        maxRequests: 15,
        windowMs: 5 * 60 * 1000, // 15 descriptions per 5 minutes
        message: 'AI description generation limit reached. Please wait a few minutes.',
    },
    AI_PHOTO_STUDIO: {
        maxRequests: 10,
        windowMs: 10 * 60 * 1000, // 10 edits per 10 minutes
        message: 'AI photo editing limit reached. Please wait before editing more images.',
    },
    // Product Operations
    PRODUCT_CREATE: {
        maxRequests: 20,
        windowMs: 5 * 60 * 1000, // 20 products per 5 minutes
        message: 'Too many products created. Please wait before adding more.',
    },
    PRODUCT_UPDATE: {
        maxRequests: 50,
        windowMs: 5 * 60 * 1000, // 50 updates per 5 minutes
        message: 'Too many product updates. Please slow down.',
    },
    PRODUCT_DELETE: {
        maxRequests: 10,
        windowMs: 60 * 1000, // 10 deletes per minute
        message: 'Too many products deleted. Please wait a moment.',
    },
    // Form Operations
    FORM_SUBMIT: {
        maxRequests: 10,
        windowMs: 5 * 60 * 1000, // 10 submissions per 5 minutes
        message: 'Too many form submissions. Please wait before submitting again.',
    },
    FORM_CREATE: {
        maxRequests: 10,
        windowMs: 60 * 60 * 1000, // 10 forms per hour
        message: 'Too many forms created. Please wait before creating more.',
    },
    // Order Operations
    ORDER_CREATE: {
        maxRequests: 15,
        windowMs: 5 * 60 * 1000, // 15 orders per 5 minutes
        message: 'Too many orders created. Please wait a moment.',
    },
    ORDER_UPDATE: {
        maxRequests: 30,
        windowMs: 60 * 1000, // 30 status updates per minute
        message: 'Too many order updates. Please slow down.',
    },
    // Shop Settings
    SHOP_UPDATE: {
        maxRequests: 20,
        windowMs: 5 * 60 * 1000, // 20 updates per 5 minutes
        message: 'Too many shop updates. Please wait a moment.',
    },
    SHOP_CREATE: {
        maxRequests: 3,
        windowMs: 24 * 60 * 60 * 1000, // 3 shops per day
        message: 'Shop creation limit reached for today. Please try again tomorrow.',
    },
    // Knowledge Base
    KB_UPDATE: {
        maxRequests: 30,
        windowMs: 5 * 60 * 1000, // 30 KB updates per 5 minutes
        message: 'Too many knowledge base updates. Please wait a moment.',
    },
    // Team Operations
    TEAM_INVITE: {
        maxRequests: 10,
        windowMs: 60 * 60 * 1000, // 10 invites per hour
        message: 'Too many team invitations sent. Please wait before sending more.',
    },
};
// ============================================
// HELPER FUNCTIONS
// ============================================
/**
 * Higher-order function to add rate limiting to any async function
 */
function withRateLimit(fn, key, config) {
    return (async (...args) => {
        const result = exports.rateLimiter.check(key, config);
        if (!result.allowed) {
            throw new Error(result.message || 'Rate limit exceeded');
        }
        return fn(...args);
    });
}
/**
 * Create a rate-limited version of a function with user-specific keys
 */
function createUserRateLimiter(fn, getUserKey, config) {
    return (async (...args) => {
        const userKey = getUserKey(...args);
        const result = exports.rateLimiter.check(userKey, config);
        if (!result.allowed) {
            throw new Error(result.message || 'Rate limit exceeded');
        }
        return fn(...args);
    });
}
