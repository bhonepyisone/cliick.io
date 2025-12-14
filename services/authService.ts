/**
 * Authentication Service - Backend API Integration
 * Uses REST API for authentication instead of Supabase Auth client
 */

import { apiClient } from './apiClient';
import { User } from '../types';
import { rateLimiter, RATE_LIMITS } from '../utils/rateLimiter';
import { validateUsername, validateEmail, sanitizeText } from '../utils/sanitize';
import { clearCsrfToken } from '../utils/csrf';
import { logger } from '../utils/logger';
import { showToast } from '../utils/toast';

// Auth state callback
type AuthCallback = (isAuthenticated: boolean, user: User | null) => void;
let authCallbacks: AuthCallback[] = [];

// Current cached user and token
let cachedUser: User | null = null;
let authToken: string | null = null;

// Load auth state from localStorage on init
function loadAuthState(): void {
    try {
        const stored = localStorage.getItem('auth_token');
        const userStored = localStorage.getItem('current_user');
        
        if (stored && userStored) {
            authToken = stored;
            cachedUser = JSON.parse(userStored);
            // Fetch fresh user data from backend
            validateTokenAndRefreshUser();
        }
    } catch (error) {
        logger.error('Error loading auth state:', error);
        clearAuthState();
    }
}

// Validate token and refresh user data from backend
async function validateTokenAndRefreshUser(): Promise<void> {
    if (!authToken) return;
    
    try {
        const response = await apiClient.getCurrentUser();
        if (response.success && response.data) {
            cachedUser = response.data as User;
            localStorage.setItem('current_user', JSON.stringify(cachedUser));
            notifyAuthCallbacks(true);
        } else {
            // Token invalid, clear auth
            clearAuthState();
        }
    } catch (error) {
        console.error('Error validating token:', error);
    }
}

// Clear auth state
function clearAuthState(): void {
    authToken = null;
    cachedUser = null;
    localStorage.removeItem('auth_token');
    localStorage.removeItem('current_user');
}

// Save auth state
function saveAuthState(token: string, user: User): void {
    authToken = token;
    cachedUser = user;
    localStorage.setItem('auth_token', token);
    localStorage.setItem('current_user', JSON.stringify(user));
}

// Notify all callbacks
function notifyAuthCallbacks(isAuthenticated: boolean): void {
    authCallbacks.forEach((callback) => {
        callback(isAuthenticated, cachedUser);
    });
}

// ============================================
// PUBLIC API (maintains same interface for compatibility)
// ============================================

export const getAuthStatus = (): boolean => {
    return !!cachedUser && !!authToken;
};

export const onAuthChange = (callback: (isAuthenticated: boolean) => void): (() => void) => {
    const wrappedCallback: AuthCallback = (isAuthenticated, user) => {
        callback(isAuthenticated);
    };
    
    authCallbacks.push(wrappedCallback);
    
    // Immediately call with current state
    callback(getAuthStatus());
    
    // Return unsubscribe function
    return () => {
        authCallbacks = authCallbacks.filter(cb => cb !== wrappedCallback);
    };
};

export const getCurrentUser = (): User | null => {
    return cachedUser;
};

export const getAuthToken = (): string | null => {
    return authToken;
};

export const login = async (email: string, password: string): Promise<boolean> => {
    try {
        // Rate limiting
        const rateLimitKey = `login:${email}`;
        const rateLimit = rateLimiter.check(rateLimitKey, RATE_LIMITS.LOGIN);
        
        if (!rateLimit.allowed) {
            logger.warn('Login rate limit exceeded', { email, resetIn: rateLimit.resetIn });
            showToast.error(rateLimit.message || 'Too many login attempts');
            return false;
        }
        
        // Sanitize input
        const sanitizedEmail = sanitizeText(email.trim().toLowerCase());
        
        // Validate email format
        const emailValidation = validateEmail(sanitizedEmail);
        if (!emailValidation.valid) {
            showToast.error('Please enter a valid email address');
            return false;
        }
        
        // Call backend login endpoint
        const response = await apiClient.login(sanitizedEmail, password);
        
        if (!response.success || !response.data) {
            logger.error('Login error', response.error);
            showToast.error('Invalid email or password');
            return false;
        }
        
        // Save auth state
        saveAuthState(response.data.token, response.data.user);
        const userId = response.data.user?.id || 'unknown';
        logger.auth('login_success', userId);
        notifyAuthCallbacks(true);
        
        // Ensure user profile exists (fixes profile creation issues from registration)
        try {
            await ensureProfileExists();
        } catch (profileError) {
            logger.warn('Profile check failed after login, user may need to re-register:', profileError);
            // Don't fail login, but warn user
        }
        
        return true;
    } catch (error: any) {
        logger.error('Login failed', error);
        showToast.error('Login failed. Please try again.');
        return false;
    }
};

export const loginWithFacebook = async (): Promise<{ success: boolean; message?: string }> => {
    try {
        // Redirect to backend OAuth endpoint
        window.location.href = `${import.meta.env.VITE_API_BASE_URL || 'https://cliick-backend-ngt5twdwha-uc.a.run.app/api'}/auth/facebook?redirect=${encodeURIComponent(window.location.origin + '/auth/callback')}`;
        return { success: true };
    } catch (error: any) {
        return { success: false, message: error.message || 'Facebook login failed' };
    }
};

export const loginWithGoogle = async (): Promise<{ success: boolean; message?: string }> => {
    try {
        // Redirect to backend OAuth endpoint
        window.location.href = `${import.meta.env.VITE_API_BASE_URL || 'https://cliick-backend-ngt5twdwha-uc.a.run.app/api'}/auth/google?redirect=${encodeURIComponent(window.location.origin + '/auth/callback')}`;
        return { success: true };
    } catch (error: any) {
        return { success: false, message: error.message || 'Google login failed' };
    }
};

// Ensure user profile exists on the backend
async function ensureProfileExists(): Promise<boolean> {
    try {
        const token = getAuthToken();
        if (!token) {
            return false;
        }
        
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'https://cliick-backend-ngt5twdwha-uc.a.run.app/api'}/auth/ensure-profile`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            credentials: 'include'
        });
        
        return response.ok;
    } catch (error) {
        logger.error('Error ensuring profile exists:', error);
        return false;
    }
}

export const isUsernameTaken = async (username: string): Promise<boolean> => {
    try {
        // Since we don't have a specific endpoint, we'll implement this check during signup
        // For now, always return false (real check happens on backend)
        return false;
    } catch (error) {
        console.error('Error checking username:', error);
        return false;
    }
};

export const signup = async (email: string, password: string, username?: string): Promise<{ success: boolean; message: string }> => {
    try {
        // Rate limiting
        const rateLimitKey = `signup:${email}`;
        const rateLimit = rateLimiter.check(rateLimitKey, RATE_LIMITS.SIGNUP);
        
        if (!rateLimit.allowed) {
            logger.warn('Signup rate limit exceeded', { email });
            return { success: false, message: rateLimit.message || 'Too many signup attempts' };
        }
        
        // Sanitize and validate email
        const sanitizedEmail = sanitizeText(email.trim().toLowerCase());
        
        if (!sanitizedEmail || !password.trim()) {
            return { success: false, message: "Email and password cannot be empty." };
        }
        
        // Validate email format
        const emailValidation = validateEmail(sanitizedEmail);
        if (!emailValidation.valid) {
            return { success: false, message: emailValidation.error || 'Invalid email address' };
        }
        
        // Sanitize and validate username if provided
        let sanitizedUsername = username ? sanitizeText(username.trim()) : sanitizedEmail.split('@')[0];
        
        if (username) {
            const usernameValidation = validateUsername(sanitizedUsername);
            if (!usernameValidation.valid) {
                return { success: false, message: usernameValidation.error || 'Invalid username' };
            }
        }
        
        // Password strength check
        if (password.length < 6) {
            return { success: false, message: 'Password must be at least 6 characters' };
        }
        
        // Call backend register endpoint
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'https://cliick-backend-ngt5twdwha-uc.a.run.app/api'}/auth/register`, {
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
            logger.error('Signup error', data.error);
            return { success: false, message: data.error || 'Signup failed' };
        }
        
        // Save auth state
        if (data.data?.user && data.data?.token) {
            saveAuthState(data.data.token, data.data.user);
            logger.auth('signup_success', data.data.user.id);
            notifyAuthCallbacks(true);
            
            // Ensure user profile exists (fixes profile creation issues from registration)
            try {
                await ensureProfileExists();
            } catch (profileError) {
                logger.warn('Profile check failed after signup:', profileError);
                // Don't fail signup, but warn user
            }
            
            return { success: true, message: 'Signup successful!' };
        }
        
        return { success: false, message: 'Signup failed - invalid response' };
    } catch (error: any) {
        logger.error('Signup failed', error);
        return { success: false, message: error.message || 'Signup failed' };
    }
};

export const logout = async (): Promise<void> => {
    try {
        await apiClient.logout();
    } catch (error) {
        console.error('Error calling logout endpoint:', error);
    }
    clearAuthState();
    clearCsrfToken();
    notifyAuthCallbacks(false);
    logger.auth('logout');
};

export const getAllUsers = async (): Promise<User[]> => {
    try {
        // Fetch all users endpoint (admin only - requires backend implementation)
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'https://cliick-backend-ngt5twdwha-uc.a.run.app/api'}/auth/users`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getAuthToken() || ''}`
            },
            credentials: 'include'
        });

        if (!response.ok) {
            return [];
        }

        const data = await response.json();
        return (data.data as User[]) || [];
    } catch (error) {
        console.error('Error fetching users:', error);
        return [];
    }
};

export const getUserByUsername = async (username: string): Promise<User | null> => {
    try {
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'https://cliick-backend-ngt5twdwha-uc.a.run.app/api'}/auth/users/${encodeURIComponent(username)}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getAuthToken() || ''}`
            },
            credentials: 'include'
        });

        if (!response.ok) {
            return null;
        }

        const data = await response.json();
        return (data.data as User) || null;
    } catch (error) {
        return null;
    }
};

export const updateUser = async (
    userId: string,
    updates: Partial<Pick<User, 'username' | 'passwordHash' | 'avatarUrl'>>
): Promise<{ success: boolean; user?: User; message?: string }> => {
    try {
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'https://cliick-backend-ngt5twdwha-uc.a.run.app/api'}/auth/users/${userId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getAuthToken() || ''}`
            },
            credentials: 'include',
            body: JSON.stringify(updates)
        });

        const data = await response.json();

        if (response.ok && data.success && data.data) {
            return { success: true, user: data.data as User };
        }

        return { success: false, message: data.error || 'Update failed' };
    } catch (error: any) {
        return { success: false, message: error.message || 'Update failed' };
    }
};

// ============================================
// INITIALIZATION
// ============================================

// Export token for API client header injection
export function getAuthHeaders(): HeadersInit {
    const token = getAuthToken();
    const headers: HeadersInit = {
        'Content-Type': 'application/json',
    };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
}

// Load auth state on module initialization
loadAuthState();