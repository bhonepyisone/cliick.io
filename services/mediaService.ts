/**
 * Unified Media Service
 * Provides a single interface for media uploads using either Supabase or Cloudinary
 */

import { supabaseStorage, BUCKETS, type UploadResult as SupabaseUploadResult } from './supabaseStorageService';
import { cloudinaryService, type CloudinaryUploadResult } from './cloudinaryService';

export type MediaProvider = 'supabase' | 'cloudinary';

export interface MediaUploadOptions {
    file: File;
    folder?: string;       // For both providers
    bucket?: string;       // Supabase specific
    tags?: string[];       // Cloudinary specific
    onProgress?: (progress: number) => void;
}

export interface MediaUploadResult {
    success: boolean;
    url?: string;
    publicUrl?: string;
    path?: string;
    publicId?: string;
    error?: string;
    provider: MediaProvider;
}

class MediaService {
    private provider: MediaProvider;

    constructor() {
        // Auto-detect provider based on environment variables
        this.provider = this.detectProvider();
    }

    /**
     * Auto-detect which provider is configured
     */
    private detectProvider(): MediaProvider {
        const hasCloudinary = cloudinaryService.isConfigured();
        const hasSupabase = !!(
            (import.meta as any).env?.VITE_SUPABASE_URL && 
            (import.meta as any).env?.VITE_SUPABASE_ANON_KEY
        );

        if (hasCloudinary) {
            console.log('📸 Media Service: Using Cloudinary');
            return 'cloudinary';
        } else if (hasSupabase) {
            console.log('🗄️ Media Service: Using Supabase Storage');
            return 'supabase';
        } else {
            console.warn('⚠️ No media provider configured. Please set up Supabase or Cloudinary.');
            return 'supabase'; // Default fallback
        }
    }

    /**
     * Get current provider
     */
    getProvider(): MediaProvider {
        return this.provider;
    }

    /**
     * Set provider manually
     */
    setProvider(provider: MediaProvider) {
        this.provider = provider;
        console.log(`📸 Media Service: Switched to ${provider}`);
    }

    /**
     * Upload file using configured provider
     */
    async uploadFile(options: MediaUploadOptions): Promise<MediaUploadResult> {
        if (this.provider === 'cloudinary') {
            return this.uploadWithCloudinary(options);
        } else {
            return this.uploadWithSupabase(options);
        }
    }

    /**
     * Upload image with validation
     */
    async uploadImage(file: File, options?: Omit<MediaUploadOptions, 'file'>): Promise<MediaUploadResult> {
        return this.uploadFile({ file, ...options });
    }

    /**
     * Upload multiple files
     */
    async uploadMultiple(files: File[], folder?: string): Promise<MediaUploadResult[]> {
        const promises = files.map(file =>
            this.uploadFile({ file, folder })
        );

        return Promise.all(promises);
    }

    /**
     * Delete file
     */
    async deleteFile(pathOrPublicId: string, bucket?: string): Promise<{ success: boolean; error?: string }> {
        if (this.provider === 'cloudinary') {
            return cloudinaryService.deleteFile(pathOrPublicId);
        } else {
            return supabaseStorage.deleteFile(bucket || BUCKETS.PRODUCTS, pathOrPublicId);
        }
    }

    /**
     * Get optimized URL
     */
    getOptimizedUrl(pathOrPublicId: string, options?: { width?: number; quality?: number }): string {
        if (this.provider === 'cloudinary') {
            return cloudinaryService.getOptimizedUrl(pathOrPublicId, options);
        } else {
            // Supabase doesn't have built-in transformations
            return pathOrPublicId;
        }
    }

    /**
     * Get thumbnail URL
     */
    getThumbnailUrl(pathOrPublicId: string, size: number = 200): string {
        if (this.provider === 'cloudinary') {
            return cloudinaryService.getThumbnailUrl(pathOrPublicId, size);
        } else {
            // Return original URL for Supabase
            return pathOrPublicId;
        }
    }

    /**
     * Upload with Cloudinary
     */
    private async uploadWithCloudinary(options: MediaUploadOptions): Promise<MediaUploadResult> {
        const result: CloudinaryUploadResult = await cloudinaryService.uploadFile({
            file: options.file,
            folder: options.folder,
            tags: options.tags,
            onProgress: options.onProgress,
        });

        return {
            success: result.success,
            url: result.secureUrl,
            publicUrl: result.secureUrl,
            publicId: result.publicId,
            error: result.error,
            provider: 'cloudinary',
        };
    }

    /**
     * Upload with Supabase
     */
    private async uploadWithSupabase(options: MediaUploadOptions): Promise<MediaUploadResult> {
        const bucket = options.bucket || BUCKETS.PRODUCTS;
        const path = options.folder ? `${options.folder}/${options.file.name}` : undefined;

        const result: SupabaseUploadResult = await supabaseStorage.uploadFile({
            bucket,
            file: options.file,
            path,
            onProgress: options.onProgress,
        });

        return {
            success: result.success,
            url: result.publicUrl,
            publicUrl: result.publicUrl,
            path: result.path,
            error: result.error,
            provider: 'supabase',
        };
    }

    /**
     * Helper: Upload avatar
     */
    async uploadAvatar(file: File, userId: string): Promise<MediaUploadResult> {
        return this.uploadFile({
            file,
            folder: this.provider === 'cloudinary' ? 'avatars' : undefined,
            bucket: BUCKETS.AVATARS,
        });
    }

    /**
     * Helper: Upload product image
     */
    async uploadProductImage(file: File, shopId: string): Promise<MediaUploadResult> {
        return this.uploadFile({
            file,
            folder: this.provider === 'cloudinary' ? `products/${shopId}` : `${shopId}`,
            bucket: BUCKETS.PRODUCTS,
        });
    }

    /**
     * Helper: Upload chat attachment
     */
    async uploadChatAttachment(file: File, conversationId: string): Promise<MediaUploadResult> {
        return this.uploadFile({
            file,
            folder: this.provider === 'cloudinary' ? `chat/${conversationId}` : conversationId,
            bucket: BUCKETS.CHAT_ATTACHMENTS,
        });
    }

    /**
     * Helper: Upload shop logo
     */
    async uploadShopLogo(file: File, shopId: string): Promise<MediaUploadResult> {
        return this.uploadFile({
            file,
            folder: this.provider === 'cloudinary' ? `logos` : undefined,
            bucket: BUCKETS.SHOP_LOGOS,
        });
    }
}

// Export singleton instance
export const mediaService = new MediaService();
export default mediaService;
