// supabase/auth.ts
// DEPRECATED: This module should not be used
// All authentication is now handled by backend API (backend/routes/auth.ts)
// and frontend authService (services/authService.ts)
// 
// Keeping this file for reference only.
// Do not import or use these functions - they will cause errors

console.warn('[DEPRECATED] supabase/auth.ts is deprecated - use services/authService.ts instead');

export const getCurrentUser = async () => {
    throw new Error('[DEPRECATED] supabase/auth.ts is deprecated - use services/authService.ts instead');
};

export const onAuthChange = (callback: (isAuthenticated: boolean) => void) => {
    throw new Error('[DEPRECATED] supabase/auth.ts is deprecated - use services/authService.ts instead');
};

export const login = async (email: string, password: string) => {
    throw new Error('[DEPRECATED] supabase/auth.ts is deprecated - use services/authService.ts instead');
};

export const signup = async (email: string, password: string, username: string) => {
    throw new Error('[DEPRECATED] supabase/auth.ts is deprecated - use services/authService.ts instead');
};

export const logout = async () => {
    throw new Error('[DEPRECATED] supabase/auth.ts is deprecated - use services/authService.ts instead');
};

