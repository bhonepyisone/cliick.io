"use strict";
/**
 * Input Sanitization & XSS Protection Utilities
 * Provides safe HTML rendering and input validation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.safeJsonParse = exports.escapeHtml = exports.sanitizeObject = exports.validateFileSignature = exports.validateFile = exports.validateCurrency = exports.validateLength = exports.validatePrice = exports.validatePhone = exports.validateEmail = exports.validateUsername = exports.sanitizeUrl = exports.sanitizeMarkdown = exports.sanitizeText = exports.sanitizeHtml = void 0;
const isomorphic_dompurify_1 = require("isomorphic-dompurify");
// ============================================
// XSS PROTECTION - HTML SANITIZATION
// ============================================
/**
 * Sanitize HTML content to prevent XSS attacks
 * Use this for any user-generated content that contains HTML
 */
const sanitizeHtml = (dirty) => {
    return isomorphic_dompurify_1.default.sanitize(dirty, {
        ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li'],
        ALLOWED_ATTR: ['href', 'target', 'rel'],
        ALLOW_DATA_ATTR: false,
        ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|cid|xmpp):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
    });
};
exports.sanitizeHtml = sanitizeHtml;
/**
 * Sanitize plain text - strips all HTML tags
 * Use this for text-only fields like usernames, product names, etc.
 */
const sanitizeText = (dirty) => {
    return isomorphic_dompurify_1.default.sanitize(dirty, {
        ALLOWED_TAGS: [],
        ALLOWED_ATTR: [],
    });
};
exports.sanitizeText = sanitizeText;
/**
 * Sanitize markdown content
 * Allows safe subset of HTML for markdown rendering
 */
const sanitizeMarkdown = (dirty) => {
    return isomorphic_dompurify_1.default.sanitize(dirty, {
        ALLOWED_TAGS: [
            'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
            'p', 'br', 'hr',
            'b', 'i', 'em', 'strong', 'u', 'strike', 'code', 'pre',
            'ul', 'ol', 'li',
            'a', 'blockquote',
            'table', 'thead', 'tbody', 'tr', 'th', 'td'
        ],
        ALLOWED_ATTR: ['href', 'target', 'rel', 'class'],
    });
};
exports.sanitizeMarkdown = sanitizeMarkdown;
/**
 * Sanitize URL to prevent javascript: and data: schemes
 */
const sanitizeUrl = (url) => {
    const cleaned = url.trim();
    // Block dangerous protocols
    if (/^(javascript|data|vbscript|file):/i.test(cleaned)) {
        return '';
    }
    return cleaned;
};
exports.sanitizeUrl = sanitizeUrl;
// ============================================
// INPUT VALIDATION
// ============================================
/**
 * Validate username
 * - Alphanumeric, underscore, hyphen only
 * - 3-20 characters
 */
const validateUsername = (username) => {
    if (!username || username.length < 3) {
        return { valid: false, error: 'Username must be at least 3 characters' };
    }
    if (username.length > 20) {
        return { valid: false, error: 'Username must not exceed 20 characters' };
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
        return { valid: false, error: 'Username can only contain letters, numbers, underscore, and hyphen' };
    }
    return { valid: true };
};
exports.validateUsername = validateUsername;
/**
 * Validate email format
 */
const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return { valid: false, error: 'Invalid email format' };
    }
    return { valid: true };
};
exports.validateEmail = validateEmail;
/**
 * Validate phone number (flexible format)
 */
const validatePhone = (phone) => {
    // Remove common separators
    const cleaned = phone.replace(/[\s\-\(\)]/g, '');
    // Check if it's numeric and reasonable length
    if (!/^\+?[0-9]{8,15}$/.test(cleaned)) {
        return { valid: false, error: 'Invalid phone number format' };
    }
    return { valid: true };
};
exports.validatePhone = validatePhone;
/**
 * Validate price/amount
 * Must be positive number with max 2 decimal places
 */
const validatePrice = (price) => {
    const num = typeof price === 'string' ? parseFloat(price) : price;
    if (isNaN(num)) {
        return { valid: false, error: 'Price must be a number' };
    }
    if (num < 0) {
        return { valid: false, error: 'Price cannot be negative' };
    }
    if (num > 999999999) {
        return { valid: false, error: 'Price is too large' };
    }
    // Check decimal places
    const decimalPlaces = (num.toString().split('.')[1] || '').length;
    if (decimalPlaces > 2) {
        return { valid: false, error: 'Price can have maximum 2 decimal places' };
    }
    return { valid: true };
};
exports.validatePrice = validatePrice;
/**
 * Validate text length
 */
const validateLength = (text, min, max, fieldName = 'Input') => {
    if (text.length < min) {
        return { valid: false, error: `${fieldName} must be at least ${min} characters` };
    }
    if (text.length > max) {
        return { valid: false, error: `${fieldName} must not exceed ${max} characters` };
    }
    return { valid: true };
};
exports.validateLength = validateLength;
/**
 * Validate currency code (ISO 4217)
 */
const validateCurrency = (currency) => {
    if (currency.length !== 3) {
        return { valid: false, error: 'Currency code must be 3 characters' };
    }
    if (!/^[A-Z]{3}$/.test(currency)) {
        return { valid: false, error: 'Currency code must be uppercase letters' };
    }
    return { valid: true };
};
exports.validateCurrency = validateCurrency;
const DEFAULT_FILE_OPTIONS = {
    maxSize: 5 * 1024 * 1024, // 5MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.webp', '.gif'],
};
/**
 * Validate file upload
 */
const validateFile = (file, options = {}) => {
    const opts = { ...DEFAULT_FILE_OPTIONS, ...options };
    // Check file size
    if (opts.maxSize && file.size > opts.maxSize) {
        const maxMB = (opts.maxSize / (1024 * 1024)).toFixed(1);
        return { valid: false, error: `File size must not exceed ${maxMB}MB` };
    }
    // Check file type
    if (opts.allowedTypes && !opts.allowedTypes.includes(file.type)) {
        return { valid: false, error: `File type ${file.type} is not allowed` };
    }
    // Check file extension
    if (opts.allowedExtensions) {
        const extension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
        if (!opts.allowedExtensions.includes(extension)) {
            return { valid: false, error: `File extension ${extension} is not allowed` };
        }
    }
    return { valid: true };
};
exports.validateFile = validateFile;
/**
 * Validate file by checking magic bytes (file signature)
 * This prevents uploading malicious files with fake extensions
 */
const validateFileSignature = async (file) => {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const arr = new Uint8Array(e.target?.result).subarray(0, 4);
            const header = Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
            // Known file signatures
            const signatures = {
                'JPEG': ['FFD8FFE0', 'FFD8FFE1', 'FFD8FFE2', 'FFD8FFDB'],
                'PNG': ['89504E47'],
                'GIF': ['47494638'],
                'WEBP': ['52494646'], // Actually checks for RIFF, WebP is more complex
            };
            // Check if header matches any known signature
            const isValid = Object.values(signatures).some(sigs => sigs.some(sig => header.startsWith(sig)));
            if (!isValid) {
                resolve({ valid: false, error: 'File signature does not match declared type' });
            }
            else {
                resolve({ valid: true });
            }
        };
        reader.onerror = () => {
            resolve({ valid: false, error: 'Failed to read file' });
        };
        reader.readAsArrayBuffer(file.slice(0, 4));
    });
};
exports.validateFileSignature = validateFileSignature;
// ============================================
// CONTENT SECURITY
// ============================================
/**
 * Remove potentially dangerous attributes from objects
 * Useful for sanitizing JSON data before storage
 */
const sanitizeObject = (obj, allowedKeys) => {
    const sanitized = {};
    for (const key of allowedKeys) {
        if (key in obj) {
            sanitized[key] = obj[key];
        }
    }
    return sanitized;
};
exports.sanitizeObject = sanitizeObject;
/**
 * Escape special characters for safe display
 */
const escapeHtml = (unsafe) => {
    return unsafe
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
};
exports.escapeHtml = escapeHtml;
/**
 * Safe JSON parse with error handling
 */
const safeJsonParse = (json, fallback) => {
    try {
        return JSON.parse(json);
    }
    catch {
        return fallback;
    }
};
exports.safeJsonParse = safeJsonParse;
