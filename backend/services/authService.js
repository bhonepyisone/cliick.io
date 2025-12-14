"use strict";
/**
 * Authentication Service - Backend API Integration
 * Uses REST API for authentication instead of Supabase Auth client
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateUser = exports.getUserByUsername = exports.getAllUsers = exports.logout = exports.signup = exports.isUsernameTaken = exports.loginWithGoogle = exports.loginWithFacebook = exports.login = exports.getAuthToken = exports.getCurrentUser = exports.onAuthChange = exports.getAuthStatus = void 0;
exports.getAuthHeaders = getAuthHeaders;
const apiClient_1 = require("./apiClient");
const rateLimiter_1 = require("../utils/rateLimiter");
const sanitize_1 = require("../utils/sanitize");
const csrf_1 = require("../utils/csrf");
const logger_1 = require("../utils/logger");
const toast_1 = require("../utils/toast");
let authCallbacks = [];
// Current cached user and token
let cachedUser = null;
let authToken = null;
// Load auth state from localStorage on init
function loadAuthState() {
    try {
        const stored = localStorage.getItem('auth_token');
        const userStored = localStorage.getItem('current_user');
        if (stored && userStored) {
            authToken = stored;
            cachedUser = JSON.parse(userStored);
            // Fetch fresh user data from backend
            validateTokenAndRefreshUser();
        }
    }
    catch (error) {
        logger_1.logger.error('Error loading auth state:', error);
        clearAuthState();
    }
}
// Validate token and refresh user data from backend
async function validateTokenAndRefreshUser() {
    if (!authToken)
        return;
    try {
        const response = await apiClient_1.apiClient.getCurrentUser();
        if (response.success && response.data) {
            cachedUser = response.data;
            localStorage.setItem('current_user', JSON.stringify(cachedUser));
            notifyAuthCallbacks(true);
        }
        else {
            // Token invalid, clear auth
            clearAuthState();
        }
    }
    catch (error) {
        console.error('Error validating token:', error);
    }
}
// Clear auth state
function clearAuthState() {
    authToken = null;
    cachedUser = null;
    localStorage.removeItem('auth_token');
    localStorage.removeItem('current_user');
}
// Save auth state
function saveAuthState(token, user) {
    authToken = token;
    cachedUser = user;
    localStorage.setItem('auth_token', token);
    localStorage.setItem('current_user', JSON.stringify(user));
}
// Notify all callbacks
function notifyAuthCallbacks(isAuthenticated) {
    authCallbacks.forEach((callback) => {
        callback(isAuthenticated, cachedUser);
    });
}
// ============================================
// PUBLIC API (maintains same interface for compatibility)
// ============================================
const getAuthStatus = () => {
    return !!cachedUser && !!authToken;
};
exports.getAuthStatus = getAuthStatus;
const onAuthChange = (callback) => {
    const wrappedCallback = (isAuthenticated, user) => {
        callback(isAuthenticated);
    };
    authCallbacks.push(wrappedCallback);
    // Immediately call with current state
    callback((0, exports.getAuthStatus)());
    // Return unsubscribe function
    return () => {
        authCallbacks = authCallbacks.filter(cb => cb !== wrappedCallback);
    };
};
exports.onAuthChange = onAuthChange;
const getCurrentUser = () => {
    return cachedUser;
};
exports.getCurrentUser = getCurrentUser;
const getAuthToken = () => {
    return authToken;
};
exports.getAuthToken = getAuthToken;
const login = async (email, password) => {
    try {
        // Rate limiting
        const rateLimitKey = `login:${email}`;
        const rateLimit = rateLimiter_1.rateLimiter.check(rateLimitKey, rateLimiter_1.RATE_LIMITS.LOGIN);
        if (!rateLimit.allowed) {
            logger_1.logger.warn('Login rate limit exceeded', { email, resetIn: rateLimit.resetIn });
            toast_1.showToast.error(rateLimit.message || 'Too many login attempts');
            return false;
        }
        // Sanitize input
        const sanitizedEmail = (0, sanitize_1.sanitizeText)(email.trim().toLowerCase());
        // Validate email format
        const emailValidation = (0, sanitize_1.validateEmail)(sanitizedEmail);
        if (!emailValidation.valid) {
            toast_1.showToast.error('Please enter a valid email address');
            return false;
        }
        // Call backend login endpoint
        const response = await apiClient_1.apiClient.login(sanitizedEmail, password);
        if (!response.success || !response.data) {
            logger_1.logger.error('Login error', response.error);
            toast_1.showToast.error('Invalid email or password');
            return false;
        }
        // Save auth state
        saveAuthState(response.data.token, response.data.user);
        const userId = response.data.user?.id || 'unknown';
        logger_1.logger.auth('login_success', userId);
        notifyAuthCallbacks(true);
        // Ensure user profile exists (fixes profile creation issues from registration)
        try {
            await ensureProfileExists();
        }
        catch (profileError) {
            logger_1.logger.warn('Profile check failed after login, user may need to re-register:', profileError);
            // Don't fail login, but warn user
        }
        return true;
    }
    catch (error) {
        logger_1.logger.error('Login failed', error);
        toast_1.showToast.error('Login failed. Please try again.');
        return false;
    }
};
exports.login = login;
const loginWithFacebook = async () => {
    try {
        // Redirect to backend OAuth endpoint
        window.location.href = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api'}/auth/facebook?redirect=${encodeURIComponent(window.location.origin + '/auth/callback')}`;
        return { success: true };
    }
    catch (error) {
        return { success: false, message: error.message || 'Facebook login failed' };
    }
};
exports.loginWithFacebook = loginWithFacebook;
const loginWithGoogle = async () => {
    try {
        // Redirect to backend OAuth endpoint
        window.location.href = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api'}/auth/google?redirect=${encodeURIComponent(window.location.origin + '/auth/callback')}`;
        return { success: true };
    }
    catch (error) {
        return { success: false, message: error.message || 'Google login failed' };
    }
};
exports.loginWithGoogle = loginWithGoogle;
// Ensure user profile exists on the backend
async function ensureProfileExists() {
    try {
        const token = (0, exports.getAuthToken)();
        if (!token) {
            return false;
        }
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api'}/auth/ensure-profile`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            credentials: 'include'
        });
        return response.ok;
    }
    catch (error) {
        logger_1.logger.error('Error ensuring profile exists:', error);
        return false;
    }
}
const isUsernameTaken = async (username) => {
    try {
        // Since we don't have a specific endpoint, we'll implement this check during signup
        // For now, always return false (real check happens on backend)
        return false;
    }
    catch (error) {
        console.error('Error checking username:', error);
        return false;
    }
};
exports.isUsernameTaken = isUsernameTaken;
const signup = async (email, password, username) => {
    try {
        // Rate limiting
        const rateLimitKey = `signup:${email}`;
        const rateLimit = rateLimiter_1.rateLimiter.check(rateLimitKey, rateLimiter_1.RATE_LIMITS.SIGNUP);
        if (!rateLimit.allowed) {
            logger_1.logger.warn('Signup rate limit exceeded', { email });
            return { success: false, message: rateLimit.message || 'Too many signup attempts' };
        }
        // Sanitize and validate email
        const sanitizedEmail = (0, sanitize_1.sanitizeText)(email.trim().toLowerCase());
        if (!sanitizedEmail || !password.trim()) {
            return { success: false, message: "Email and password cannot be empty." };
        }
        // Validate email format
        const emailValidation = (0, sanitize_1.validateEmail)(sanitizedEmail);
        if (!emailValidation.valid) {
            return { success: false, message: emailValidation.error || 'Invalid email address' };
        }
        // Sanitize and validate username if provided
        let sanitizedUsername = username ? (0, sanitize_1.sanitizeText)(username.trim()) : sanitizedEmail.split('@')[0];
        if (username) {
            const usernameValidation = (0, sanitize_1.validateUsername)(sanitizedUsername);
            if (!usernameValidation.valid) {
                return { success: false, message: usernameValidation.error || 'Invalid username' };
            }
        }
        // Password strength check
        if (password.length < 6) {
            return { success: false, message: 'Password must be at least 6 characters' };
        }
        // Call backend register endpoint
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api'}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: sanitizedEmail,
                password,
                username: sanitizedUsername
            })
        });
        const data = await response.json();
        if (!response.ok) {
            logger_1.logger.error('Signup error', data.error);
            return { success: false, message: data.error || 'Signup failed' };
        }
        // Save auth state
        if (data.data?.user && data.data?.token) {
            saveAuthState(data.data.token, data.data.user);
            logger_1.logger.auth('signup_success', data.data.user.id);
            notifyAuthCallbacks(true);
            // Ensure user profile exists (fixes profile creation issues from registration)
            try {
                await ensureProfileExists();
            }
            catch (profileError) {
                logger_1.logger.warn('Profile check failed after signup:', profileError);
                // Don't fail signup, but warn user
            }
            return { success: true, message: 'Signup successful!' };
        }
        return { success: false, message: 'Signup failed - invalid response' };
    }
    catch (error) {
        logger_1.logger.error('Signup failed', error);
        return { success: false, message: error.message || 'Signup failed' };
    }
};
exports.signup = signup;
const logout = async () => {
    try {
        await apiClient_1.apiClient.logout();
    }
    catch (error) {
        console.error('Error calling logout endpoint:', error);
    }
    clearAuthState();
    (0, csrf_1.clearCsrfToken)();
    notifyAuthCallbacks(false);
    logger_1.logger.auth('logout');
};
exports.logout = logout;
const getAllUsers = async () => {
    try {
        // Fetch all users endpoint (admin only - requires backend implementation)
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api'}/auth/users`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${(0, exports.getAuthToken)() || ''}`
            },
            credentials: 'include'
        });
        if (!response.ok) {
            return [];
        }
        const data = await response.json();
        return data.data || [];
    }
    catch (error) {
        console.error('Error fetching users:', error);
        return [];
    }
};
exports.getAllUsers = getAllUsers;
const getUserByUsername = async (username) => {
    try {
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api'}/auth/users/${encodeURIComponent(username)}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${(0, exports.getAuthToken)() || ''}`
            },
            credentials: 'include'
        });
        if (!response.ok) {
            return null;
        }
        const data = await response.json();
        return data.data || null;
    }
    catch (error) {
        return null;
    }
};
exports.getUserByUsername = getUserByUsername;
const updateUser = async (userId, updates) => {
    try {
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api'}/auth/users/${userId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${(0, exports.getAuthToken)() || ''}`
            },
            credentials: 'include',
            body: JSON.stringify(updates)
        });
        const data = await response.json();
        if (response.ok && data.success && data.data) {
            return { success: true, user: data.data };
        }
        return { success: false, message: data.error || 'Update failed' };
    }
    catch (error) {
        return { success: false, message: error.message || 'Update failed' };
    }
};
exports.updateUser = updateUser;
// ============================================
// INITIALIZATION
// ============================================
// Export token for API client header injection
function getAuthHeaders() {
    const token = (0, exports.getAuthToken)();
    const headers = {
        'Content-Type': 'application/json',
    };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
}
// Load auth state on module initialization
loadAuthState();
