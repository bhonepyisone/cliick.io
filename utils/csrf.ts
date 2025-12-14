/**
 * CSRF (Cross-Site Request Forgery) Protection
 * Generates and validates CSRF tokens for form submissions
 */

const CSRF_TOKEN_KEY = 'csrf_token';
const CSRF_EXPIRY_MS = 60 * 60 * 1000; // 1 hour

interface CsrfToken {
    token: string;
    expiresAt: number;
}

/**
 * Generate a cryptographically secure random token
 */
export const generateCsrfToken = (): string => {
    // Use crypto.randomUUID for strong randomness
    const token = crypto.randomUUID();
    
    // Store with expiry
    const csrfData: CsrfToken = {
        token,
        expiresAt: Date.now() + CSRF_EXPIRY_MS,
    };
    
    sessionStorage.setItem(CSRF_TOKEN_KEY, JSON.stringify(csrfData));
    
    return token;
};

/**
 * Get current CSRF token (generates new one if expired)
 */
export const getCsrfToken = (): string => {
    const stored = sessionStorage.getItem(CSRF_TOKEN_KEY);
    
    if (stored) {
        try {
            const csrfData: CsrfToken = JSON.parse(stored);
            
            // Check if expired
            if (Date.now() < csrfData.expiresAt) {
                return csrfData.token;
            }
        } catch {
            // Invalid JSON, generate new token
        }
    }
    
    // Generate new token if none exists or expired
    return generateCsrfToken();
};

/**
 * Validate CSRF token
 */
export const validateCsrfToken = (token: string): boolean => {
    const stored = sessionStorage.getItem(CSRF_TOKEN_KEY);
    
    if (!stored) {
        return false;
    }
    
    try {
        const csrfData: CsrfToken = JSON.parse(stored);
        
        // Check if expired
        if (Date.now() >= csrfData.expiresAt) {
            return false;
        }
        
        // Compare tokens
        return csrfData.token === token;
    } catch {
        return false;
    }
};

/**
 * Clear CSRF token (call on logout)
 */
export const clearCsrfToken = (): void => {
    sessionStorage.removeItem(CSRF_TOKEN_KEY);
};

/**
 * Add CSRF token to form data
 */
export const addCsrfToFormData = (formData: FormData): FormData => {
    const token = getCsrfToken();
    formData.append('_csrf', token);
    return formData;
};

/**
 * Add CSRF token to request headers
 */
export const addCsrfToHeaders = (headers: HeadersInit = {}): HeadersInit => {
    const token = getCsrfToken();
    return {
        ...headers,
        'X-CSRF-Token': token,
    };
};

/**
 * Validate CSRF token from FormData
 */
export const validateFormCsrf = (formData: FormData): boolean => {
    const token = formData.get('_csrf');
    if (typeof token !== 'string') {
        return false;
    }
    return validateCsrfToken(token);
};

/**
 * React Hook for CSRF token
 */
export const useCsrfToken = () => {
    const token = getCsrfToken();
    
    return {
        token,
        addToFormData: addCsrfToFormData,
        addToHeaders: addCsrfToHeaders,
        validate: validateCsrfToken,
    };
};
