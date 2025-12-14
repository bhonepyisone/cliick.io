/**
 * Production-Ready Logging System
 * Replaces console.log with environment-aware logging
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

class Logger {
    private logLevel: LogLevel;
    private isDevelopment: boolean;

    constructor() {
        // Get log level from environment, default to 'error' in production
        const envLogLevel = import.meta.env.VITE_LOG_LEVEL as LogLevel | undefined;
        const devMode = import.meta.env.VITE_DEV_MODE === 'true';
        
        this.isDevelopment = devMode || import.meta.env.MODE === 'development';
        this.logLevel = envLogLevel || (this.isDevelopment ? 'debug' : 'error');
    }

    /**
     * Check if a log level should be output
     */
    private shouldLog(level: LogLevel): boolean {
        const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
        const currentLevelIndex = levels.indexOf(this.logLevel);
        const requestedLevelIndex = levels.indexOf(level);
        
        return requestedLevelIndex >= currentLevelIndex;
    }

    /**
     * Format log message with timestamp and context
     */
    private formatMessage(level: LogLevel, message: string, context?: any): string {
        const timestamp = new Date().toISOString();
        const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
        
        if (context) {
            return `${prefix} ${message}`;
        }
        
        return `${prefix} ${message}`;
    }

    /**
     * Debug level logging (development only)
     */
    debug(message: string, ...args: any[]): void {
        if (this.shouldLog('debug')) {
            const formatted = this.formatMessage('debug', message);
            console.log(formatted, ...args);
        }
    }

    /**
     * Info level logging
     */
    info(message: string, ...args: any[]): void {
        if (this.shouldLog('info')) {
            const formatted = this.formatMessage('info', message);
            console.info(formatted, ...args);
        }
    }

    /**
     * Warning level logging
     */
    warn(message: string, ...args: any[]): void {
        if (this.shouldLog('warn')) {
            const formatted = this.formatMessage('warn', message);
            console.warn(formatted, ...args);
        }
    }

    /**
     * Error level logging (always shown)
     */
    error(message: string, error?: any, ...args: any[]): void {
        if (this.shouldLog('error')) {
            const formatted = this.formatMessage('error', message);
            console.error(formatted, error, ...args);
            
            // In production, send to error tracking service
            if (!this.isDevelopment && typeof window !== 'undefined') {
                this.sendToErrorTracking(message, error);
            }
        }
    }

    /**
     * Send errors to tracking service (Sentry, LogRocket, etc.)
     */
    private sendToErrorTracking(message: string, error?: any): void {
        // TODO: Integrate with error tracking service
        // Example: Sentry.captureException(error, { extra: { message } });
        
        // For now, store in session storage for debugging
        try {
            const errorLog = {
                message,
                error: error?.message || String(error),
                stack: error?.stack,
                timestamp: new Date().toISOString(),
                userAgent: navigator.userAgent,
                url: window.location.href,
            };
            
            const existingErrors = JSON.parse(sessionStorage.getItem('error_log') || '[]');
            existingErrors.push(errorLog);
            
            // Keep only last 50 errors
            if (existingErrors.length > 50) {
                existingErrors.shift();
            }
            
            sessionStorage.setItem('error_log', JSON.stringify(existingErrors));
        } catch (e) {
            // Fail silently if sessionStorage is unavailable
        }
    }

    /**
     * Log API requests (development only)
     */
    apiRequest(method: string, url: string, data?: any): void {
        if (this.shouldLog('debug')) {
            this.debug(`API ${method} ${url}`, data);
        }
    }

    /**
     * Log API responses (development only)
     */
    apiResponse(method: string, url: string, status: number, data?: any): void {
        if (this.shouldLog('debug')) {
            this.debug(`API ${method} ${url} → ${status}`, data);
        }
    }

    /**
     * Log API errors
     */
    apiError(method: string, url: string, error: any): void {
        this.error(`API ${method} ${url} failed`, error);
    }

    /**
     * Log database operations
     */
    dbOperation(operation: string, table: string, data?: any): void {
        if (this.shouldLog('debug')) {
            this.debug(`DB ${operation} ${table}`, data);
        }
    }

    /**
     * Log database errors
     */
    dbError(operation: string, table: string, error: any): void {
        this.error(`DB ${operation} ${table} failed`, error);
    }

    /**
     * Log real-time events
     */
    realtime(event: string, data?: any): void {
        if (this.shouldLog('debug')) {
            this.debug(`📡 Realtime: ${event}`, data);
        }
    }

    /**
     * Log authentication events
     */
    auth(event: string, userId?: string): void {
        if (this.shouldLog('info')) {
            this.info(`🔐 Auth: ${event}`, userId ? { userId } : undefined);
        }
    }

    /**
     * Log performance metrics
     */
    performance(metric: string, duration: number): void {
        if (this.shouldLog('debug')) {
            this.debug(`⚡ Performance: ${metric} took ${duration}ms`);
        }
    }

    /**
     * Create a timer for performance logging
     */
    startTimer(label: string): () => void {
        const start = performance.now();
        return () => {
            const duration = performance.now() - start;
            this.performance(label, Math.round(duration));
        };
    }

    /**
     * Group logs together
     */
    group(label: string, callback: () => void): void {
        if (this.shouldLog('debug')) {
            console.group(label);
            callback();
            console.groupEnd();
        }
    }

    /**
     * Get stored error log (for debugging)
     */
    getErrorLog(): any[] {
        try {
            return JSON.parse(sessionStorage.getItem('error_log') || '[]');
        } catch {
            return [];
        }
    }

    /**
     * Clear error log
     */
    clearErrorLog(): void {
        try {
            sessionStorage.removeItem('error_log');
        } catch {
            // Fail silently
        }
    }
}

// Export singleton instance
export const logger = new Logger();

// Export default
export default logger;
