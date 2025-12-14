/**
 * Retry Service - Provides exponential backoff retry logic for failed API calls
 */

interface RetryOptions {
    maxRetries?: number;
    initialDelay?: number;
    maxDelay?: number;
    backoffMultiplier?: number;
    shouldRetry?: (error: any) => boolean;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
    maxRetries: 3,
    initialDelay: 1000, // 1 second
    maxDelay: 10000, // 10 seconds
    backoffMultiplier: 2,
    shouldRetry: (error: any) => {
        // Retry on network errors, 5xx server errors, or timeouts
        if (!error.response) return true; // Network error
        const status = error.response?.status || 0;
        return status >= 500 || status === 408 || status === 429; // Server error, timeout, or rate limit
    }
};

/**
 * Executes a function with exponential backoff retry logic
 * @param fn The async function to execute
 * @param options Retry configuration options
 * @returns Promise resolving to the function result
 */
export async function withRetry<T>(
    fn: () => Promise<T>,
    options: RetryOptions = {}
): Promise<T> {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    let lastError: any;
    
    for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;
            
            // Don't retry if this is the last attempt
            if (attempt === opts.maxRetries) {
                break;
            }
            
            // Check if we should retry this error
            if (!opts.shouldRetry(error)) {
                throw error;
            }
            
            // Calculate delay with exponential backoff
            const delay = Math.min(
                opts.initialDelay * Math.pow(opts.backoffMultiplier, attempt),
                opts.maxDelay
            );
            
            // Add jitter to prevent thundering herd
            const jitter = Math.random() * 0.3 * delay; // ±30% jitter
            const finalDelay = delay + jitter;
            
            console.warn(`Attempt ${attempt + 1} failed, retrying in ${Math.round(finalDelay)}ms...`, error);
            
            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, finalDelay));
        }
    }
    
    // All retries exhausted
    console.error(`All ${opts.maxRetries} retry attempts exhausted`, lastError);
    throw lastError;
}

/**
 * Wraps an async function to automatically retry on failure
 * @param fn The async function to wrap
 * @param options Retry configuration options
 * @returns A new function with retry logic
 */
export function withRetryWrapper<T extends (...args: any[]) => Promise<any>>(
    fn: T,
    options: RetryOptions = {}
): T {
    return ((...args: Parameters<T>) => {
        return withRetry(() => fn(...args), options);
    }) as T;
}

/**
 * Circuit breaker state management
 */
class CircuitBreaker {
    private failureCount = 0;
    private lastFailureTime = 0;
    private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
    
    constructor(
        private threshold = 5,
        private timeout = 60000, // 1 minute
        private resetTimeout = 30000 // 30 seconds
    ) {}
    
    async execute<T>(fn: () => Promise<T>): Promise<T> {
        if (this.state === 'OPEN') {
            if (Date.now() - this.lastFailureTime > this.resetTimeout) {
                this.state = 'HALF_OPEN';
            } else {
                throw new Error('Circuit breaker is OPEN');
            }
        }
        
        try {
            const result = await fn();
            this.onSuccess();
            return result;
        } catch (error) {
            this.onFailure();
            throw error;
        }
    }
    
    private onSuccess() {
        this.failureCount = 0;
        this.state = 'CLOSED';
    }
    
    private onFailure() {
        this.failureCount++;
        this.lastFailureTime = Date.now();
        
        if (this.failureCount >= this.threshold) {
            this.state = 'OPEN';
            console.warn('Circuit breaker opened due to repeated failures');
        }
    }
    
    getState() {
        return this.state;
    }
}

// Export a default circuit breaker instance
export const defaultCircuitBreaker = new CircuitBreaker();

/**
 * Combines retry logic with circuit breaker
 */
export async function withRetryAndCircuitBreaker<T>(
    fn: () => Promise<T>,
    retryOptions: RetryOptions = {},
    circuitBreaker: CircuitBreaker = defaultCircuitBreaker
): Promise<T> {
    return circuitBreaker.execute(() => withRetry(fn, retryOptions));
}
