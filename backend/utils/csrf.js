"use strict";
/**
 * CSRF (Cross-Site Request Forgery) Protection
 * Generates and validates CSRF tokens for form submissions
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.useCsrfToken = exports.validateFormCsrf = exports.addCsrfToHeaders = exports.addCsrfToFormData = exports.clearCsrfToken = exports.validateCsrfToken = exports.getCsrfToken = exports.generateCsrfToken = void 0;
const CSRF_TOKEN_KEY = 'csrf_token';
const CSRF_EXPIRY_MS = 60 * 60 * 1000; // 1 hour
/**
 * Generate a cryptographically secure random token
 */
const generateCsrfToken = () => {
    // Use crypto.randomUUID for strong randomness
    const token = crypto.randomUUID();
    // Store with expiry
    const csrfData = {
        token,
        expiresAt: Date.now() + CSRF_EXPIRY_MS,
    };
    sessionStorage.setItem(CSRF_TOKEN_KEY, JSON.stringify(csrfData));
    return token;
};
exports.generateCsrfToken = generateCsrfToken;
/**
 * Get current CSRF token (generates new one if expired)
 */
const getCsrfToken = () => {
    const stored = sessionStorage.getItem(CSRF_TOKEN_KEY);
    if (stored) {
        try {
            const csrfData = JSON.parse(stored);
            // Check if expired
            if (Date.now() < csrfData.expiresAt) {
                return csrfData.token;
            }
        }
        catch {
            // Invalid JSON, generate new token
        }
    }
    // Generate new token if none exists or expired
    return (0, exports.generateCsrfToken)();
};
exports.getCsrfToken = getCsrfToken;
/**
 * Validate CSRF token
 */
const validateCsrfToken = (token) => {
    const stored = sessionStorage.getItem(CSRF_TOKEN_KEY);
    if (!stored) {
        return false;
    }
    try {
        const csrfData = JSON.parse(stored);
        // Check if expired
        if (Date.now() >= csrfData.expiresAt) {
            return false;
        }
        // Compare tokens
        return csrfData.token === token;
    }
    catch {
        return false;
    }
};
exports.validateCsrfToken = validateCsrfToken;
/**
 * Clear CSRF token (call on logout)
 */
const clearCsrfToken = () => {
    sessionStorage.removeItem(CSRF_TOKEN_KEY);
};
exports.clearCsrfToken = clearCsrfToken;
/**
 * Add CSRF token to form data
 */
const addCsrfToFormData = (formData) => {
    const token = (0, exports.getCsrfToken)();
    formData.append('_csrf', token);
    return formData;
};
exports.addCsrfToFormData = addCsrfToFormData;
/**
 * Add CSRF token to request headers
 */
const addCsrfToHeaders = (headers = {}) => {
    const token = (0, exports.getCsrfToken)();
    return {
        ...headers,
        'X-CSRF-Token': token,
    };
};
exports.addCsrfToHeaders = addCsrfToHeaders;
/**
 * Validate CSRF token from FormData
 */
const validateFormCsrf = (formData) => {
    const token = formData.get('_csrf');
    if (typeof token !== 'string') {
        return false;
    }
    return (0, exports.validateCsrfToken)(token);
};
exports.validateFormCsrf = validateFormCsrf;
/**
 * React Hook for CSRF token
 */
const useCsrfToken = () => {
    const token = (0, exports.getCsrfToken)();
    return {
        token,
        addToFormData: exports.addCsrfToFormData,
        addToHeaders: exports.addCsrfToHeaders,
        validate: exports.validateCsrfToken,
    };
};
exports.useCsrfToken = useCsrfToken;
