/**
 * Input Sanitization & XSS Protection Utilities
 * Provides safe HTML rendering and input validation
 */

import DOMPurify from 'isomorphic-dompurify';

// ============================================
// XSS PROTECTION - HTML SANITIZATION
// ============================================

/**
 * Sanitize HTML content to prevent XSS attacks
 * Use this for any user-generated content that contains HTML
 */
export const sanitizeHtml = (dirty: string): string => {
    return DOMPurify.sanitize(dirty, {
        ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li'],
        ALLOWED_ATTR: ['href', 'target', 'rel'],
        ALLOW_DATA_ATTR: false,
        ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|cid|xmpp):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
    });
};

/**
 * Sanitize plain text - strips all HTML tags
 * Use this for text-only fields like usernames, product names, etc.
 */
export const sanitizeText = (dirty: string): string => {
    return DOMPurify.sanitize(dirty, {
        ALLOWED_TAGS: [],
        ALLOWED_ATTR: [],
    });
};

/**
 * Sanitize markdown content
 * Allows safe subset of HTML for markdown rendering
 */
export const sanitizeMarkdown = (dirty: string): string => {
    return DOMPurify.sanitize(dirty, {
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

/**
 * Sanitize URL to prevent javascript: and data: schemes
 */
export const sanitizeUrl = (url: string): string => {
    const cleaned = url.trim();
    
    // Block dangerous protocols
    if (/^(javascript|data|vbscript|file):/i.test(cleaned)) {
        return '';
    }
    
    return cleaned;
};

// ============================================
// INPUT VALIDATION
// ============================================

/**
 * Validate username
 * - Alphanumeric, underscore, hyphen only
 * - 3-20 characters
 */
export const validateUsername = (username: string): { valid: boolean; error?: string } => {
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

/**
 * Validate email format
 */
export const validateEmail = (email: string): { valid: boolean; error?: string } => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return { valid: false, error: 'Invalid email format' };
    }
    return { valid: true };
};

/**
 * Validate phone number (flexible format)
 */
export const validatePhone = (phone: string): { valid: boolean; error?: string } => {
    // Remove common separators
    const cleaned = phone.replace(/[\s\-\(\)]/g, '');
    
    // Check if it's numeric and reasonable length
    if (!/^\+?[0-9]{8,15}$/.test(cleaned)) {
        return { valid: false, error: 'Invalid phone number format' };
    }
    return { valid: true };
};

/**
 * Validate price/amount
 * Must be positive number with max 2 decimal places
 */
export const validatePrice = (price: number | string): { valid: boolean; error?: string } => {
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

/**
 * Validate text length
 */
export const validateLength = (
    text: string,
    min: number,
    max: number,
    fieldName: string = 'Input'
): { valid: boolean; error?: string } => {
    if (text.length < min) {
        return { valid: false, error: `${fieldName} must be at least ${min} characters` };
    }
    if (text.length > max) {
        return { valid: false, error: `${fieldName} must not exceed ${max} characters` };
    }
    return { valid: true };
};

/**
 * Validate currency code (ISO 4217)
 */
export const validateCurrency = (currency: string): { valid: boolean; error?: string } => {
    if (currency.length !== 3) {
        return { valid: false, error: 'Currency code must be 3 characters' };
    }
    if (!/^[A-Z]{3}$/.test(currency)) {
        return { valid: false, error: 'Currency code must be uppercase letters' };
    }
    return { valid: true };
};

// ============================================
// FILE UPLOAD VALIDATION
// ============================================

export interface FileValidationOptions {
    maxSize?: number; // in bytes
    allowedTypes?: string[];
    allowedExtensions?: string[];
}

const DEFAULT_FILE_OPTIONS: FileValidationOptions = {
    maxSize: 5 * 1024 * 1024, // 5MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.webp', '.gif'],
};

/**
 * Validate file upload
 */
export const validateFile = (
    file: File,
    options: FileValidationOptions = {}
): { valid: boolean; error?: string } => {
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

/**
 * Validate file by checking magic bytes (file signature)
 * This prevents uploading malicious files with fake extensions
 */
export const validateFileSignature = async (file: File): Promise<{ valid: boolean; error?: string }> => {
    return new Promise((resolve) => {
        const reader = new FileReader();
        
        reader.onload = (e) => {
            const arr = new Uint8Array(e.target?.result as ArrayBuffer).subarray(0, 4);
            const header = Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
            
            // Known file signatures
            const signatures: { [key: string]: string[] } = {
                'JPEG': ['FFD8FFE0', 'FFD8FFE1', 'FFD8FFE2', 'FFD8FFDB'],
                'PNG': ['89504E47'],
                'GIF': ['47494638'],
                'WEBP': ['52494646'], // Actually checks for RIFF, WebP is more complex
            };
            
            // Check if header matches any known signature
            const isValid = Object.values(signatures).some(sigs => 
                sigs.some(sig => header.startsWith(sig))
            );
            
            if (!isValid) {
                resolve({ valid: false, error: 'File signature does not match declared type' });
            } else {
                resolve({ valid: true });
            }
        };
        
        reader.onerror = () => {
            resolve({ valid: false, error: 'Failed to read file' });
        };
        
        reader.readAsArrayBuffer(file.slice(0, 4));
    });
};

// ============================================
// CONTENT SECURITY
// ============================================

/**
 * Remove potentially dangerous attributes from objects
 * Useful for sanitizing JSON data before storage
 */
export const sanitizeObject = <T extends Record<string, any>>(obj: T, allowedKeys: string[]): Partial<T> => {
    const sanitized: any = {};
    
    for (const key of allowedKeys) {
        if (key in obj) {
            sanitized[key] = obj[key];
        }
    }
    
    return sanitized;
};

/**
 * Escape special characters for safe display
 */
export const escapeHtml = (unsafe: string): string => {
    return unsafe
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
};

/**
 * Safe JSON parse with error handling
 */
export const safeJsonParse = <T = any>(json: string, fallback: T): T => {
    try {
        return JSON.parse(json);
    } catch {
        return fallback;
    }
};
