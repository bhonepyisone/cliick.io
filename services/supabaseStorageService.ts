/**
 * Supabase Storage Service
 * Handles file uploads, downloads, and management using Supabase Storage
 */

import { supabase } from '../supabase/client';

export interface UploadOptions {
    bucket: string;
    file: File;
    path?: string;
    upsert?: boolean;
    onProgress?: (progress: number) => void;
}

export interface UploadResult {
    success: boolean;
    publicUrl?: string;
    path?: string;
    error?: string;
}

export interface DeleteResult {
    success: boolean;
    error?: string;
}

/**
 * Available Storage Buckets
 */
export const BUCKETS = {
    AVATARS: 'avatars',           // User profile pictures
    PRODUCTS: 'products',         // Product images
    CHAT_ATTACHMENTS: 'chat-attachments',  // Chat images/files
    SHOP_LOGOS: 'shop-logos',     // Shop branding
    RECEIPTS: 'receipts',         // Receipt images
    FORMS: 'forms',               // Form attachments
} as const;

class SupabaseStorageService {
    /**
     * Upload a file to Supabase Storage
     */
    async uploadFile(options: UploadOptions): Promise<UploadResult> {
        const { bucket, file, path, upsert = false, onProgress } = options;

        try {
            // Validate file
            if (!file) {
                return { success: false, error: 'No file provided' };
            }

            // Generate unique filename if no path provided
            const fileName = path || this.generateFileName(file.name);
            
            // Simulate progress (Supabase doesn't provide real-time progress)
            if (onProgress) {
                onProgress(0);
                setTimeout(() => onProgress(50), 100);
            }

            // Upload file
            const { data, error } = await supabase.storage
                .from(bucket)
                .upload(fileName, file, {
                    cacheControl: '3600',
                    upsert,
                });

            if (error) {
                return { success: false, error: error.message };
            }

            if (onProgress) onProgress(100);

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from(bucket)
                .getPublicUrl(data.path);

            return {
                success: true,
                publicUrl,
                path: data.path,
            };
        } catch (error: any) {
            return {
                success: false,
                error: error.message || 'Upload failed',
            };
        }
    }

    /**
     * Upload multiple files
     */
    async uploadMultiple(files: File[], bucket: string, basePath?: string): Promise<UploadResult[]> {
        const promises = files.map(file =>
            this.uploadFile({
                bucket,
                file,
                path: basePath ? `${basePath}/${this.generateFileName(file.name)}` : undefined,
            })
        );

        return Promise.all(promises);
    }

    /**
     * Delete a file from storage
     */
    async deleteFile(bucket: string, path: string): Promise<DeleteResult> {
        try {
            const { error } = await supabase.storage
                .from(bucket)
                .remove([path]);

            if (error) {
                return { success: false, error: error.message };
            }

            return { success: true };
        } catch (error: any) {
            return {
                success: false,
                error: error.message || 'Delete failed',
            };
        }
    }

    /**
     * Delete multiple files
     */
    async deleteMultiple(bucket: string, paths: string[]): Promise<DeleteResult> {
        try {
            const { error } = await supabase.storage
                .from(bucket)
                .remove(paths);

            if (error) {
                return { success: false, error: error.message };
            }

            return { success: true };
        } catch (error: any) {
            return {
                success: false,
                error: error.message || 'Delete failed',
            };
        }
    }

    /**
     * Get public URL for a file
     */
    getPublicUrl(bucket: string, path: string): string {
        const { data } = supabase.storage
            .from(bucket)
            .getPublicUrl(path);

        return data.publicUrl;
    }

    /**
     * Create a signed URL (temporary access)
     */
    async createSignedUrl(bucket: string, path: string, expiresIn: number = 3600): Promise<string | null> {
        try {
            const { data, error } = await supabase.storage
                .from(bucket)
                .createSignedUrl(path, expiresIn);

            if (error) {
                console.error('Error creating signed URL:', error.message);
                return null;
            }

            return data.signedUrl;
        } catch (error) {
            console.error('Error creating signed URL:', error);
            return null;
        }
    }

    /**
     * List files in a bucket
     */
    async listFiles(bucket: string, path: string = '', options?: { limit?: number; offset?: number; sortBy?: { column: string; order: 'asc' | 'desc' } }) {
        try {
            const { data, error } = await supabase.storage
                .from(bucket)
                .list(path, options);

            if (error) {
                return { success: false, error: error.message };
            }

            return { success: true, files: data };
        } catch (error: any) {
            return {
                success: false,
                error: error.message || 'List failed',
            };
        }
    }

    /**
     * Move/rename a file
     */
    async moveFile(bucket: string, fromPath: string, toPath: string): Promise<DeleteResult> {
        try {
            const { error } = await supabase.storage
                .from(bucket)
                .move(fromPath, toPath);

            if (error) {
                return { success: false, error: error.message };
            }

            return { success: true };
        } catch (error: any) {
            return {
                success: false,
                error: error.message || 'Move failed',
            };
        }
    }

    /**
     * Copy a file
     */
    async copyFile(bucket: string, fromPath: string, toPath: string): Promise<DeleteResult> {
        try {
            const { error } = await supabase.storage
                .from(bucket)
                .copy(fromPath, toPath);

            if (error) {
                return { success: false, error: error.message };
            }

            return { success: true };
        } catch (error: any) {
            return {
                success: false,
                error: error.message || 'Copy failed',
            };
        }
    }

    /**
     * Download a file
     */
    async downloadFile(bucket: string, path: string): Promise<{ success: boolean; data?: Blob; error?: string }> {
        try {
            const { data, error } = await supabase.storage
                .from(bucket)
                .download(path);

            if (error) {
                return { success: false, error: error.message };
            }

            return { success: true, data };
        } catch (error: any) {
            return {
                success: false,
                error: error.message || 'Download failed',
            };
        }
    }

    /**
     * Get file metadata
     */
    async getFileInfo(bucket: string, path: string) {
        try {
            const { data, error } = await supabase.storage
                .from(bucket)
                .list(path.split('/').slice(0, -1).join('/'), {
                    search: path.split('/').pop(),
                });

            if (error || !data || data.length === 0) {
                return { success: false, error: 'File not found' };
            }

            return { success: true, info: data[0] };
        } catch (error: any) {
            return {
                success: false,
                error: error.message || 'Get info failed',
            };
        }
    }

    /**
     * Upload with image validation
     */
    async uploadImage(options: Omit<UploadOptions, 'bucket'> & { bucket?: string; maxSizeMB?: number }): Promise<UploadResult> {
        const { file, bucket = BUCKETS.PRODUCTS, maxSizeMB = 5 } = options;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            return { success: false, error: 'File must be an image' };
        }

        // Validate file size
        const maxSizeBytes = maxSizeMB * 1024 * 1024;
        if (file.size > maxSizeBytes) {
            return { success: false, error: `Image must be less than ${maxSizeMB}MB` };
        }

        return this.uploadFile({ ...options, bucket });
    }

    /**
     * Helper: Generate unique filename
     */
    private generateFileName(originalName: string): string {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 9);
        const extension = originalName.split('.').pop();
        return `${timestamp}-${random}.${extension}`;
    }

    /**
     * Helper: Validate image file
     */
    isValidImage(file: File): { valid: boolean; error?: string } {
        const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        
        if (!validTypes.includes(file.type)) {
            return {
                valid: false,
                error: 'Invalid image type. Allowed: JPEG, PNG, GIF, WebP',
            };
        }

        const maxSize = 10 * 1024 * 1024; // 10MB
        if (file.size > maxSize) {
            return {
                valid: false,
                error: 'Image too large. Maximum size: 10MB',
            };
        }

        return { valid: true };
    }
}

// Export singleton instance
export const supabaseStorage = new SupabaseStorageService();
export default supabaseStorage;
