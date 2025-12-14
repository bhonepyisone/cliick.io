/**
 * Cloudinary Service
 * Handles media uploads and transformations using Cloudinary
 */

import { validateFile, validateFileSignature } from '../utils/sanitize';

export interface CloudinaryUploadOptions {
    file: File;
    folder?: string;
    publicId?: string;
    tags?: string[];
    transformation?: CloudinaryTransformation;
    onProgress?: (progress: number) => void;
}

export interface CloudinaryTransformation {
    width?: number;
    height?: number;
    crop?: 'scale' | 'fit' | 'limit' | 'fill' | 'thumb' | 'crop';
    quality?: number | 'auto';
    format?: 'jpg' | 'png' | 'webp' | 'auto';
    gravity?: 'auto' | 'face' | 'center' | 'north' | 'south' | 'east' | 'west';
}

export interface CloudinaryUploadResult {
    success: boolean;
    url?: string;
    secureUrl?: string;
    publicId?: string;
    format?: string;
    width?: number;
    height?: number;
    error?: string;
}

class CloudinaryService {
    private cloudName: string;
    private uploadPreset: string;
    private apiKey?: string;

    constructor() {
        // Get from environment variables
        this.cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || '';
        this.uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || '';
        this.apiKey = import.meta.env.VITE_CLOUDINARY_API_KEY;

        if (!this.cloudName || !this.uploadPreset) {
            console.warn('Cloudinary not configured. Set VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET');
        }
    }

    /**
     * Check if Cloudinary is configured
     */
    isConfigured(): boolean {
        return !!(this.cloudName && this.uploadPreset);
    }

    /**
     * Upload file to Cloudinary
     */
    async uploadFile(options: CloudinaryUploadOptions): Promise<CloudinaryUploadResult> {
        if (!this.isConfigured()) {
            return {
                success: false,
                error: 'Cloudinary not configured. Add VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET to .env.local',
            };
        }

        const { file, folder, publicId, tags, transformation, onProgress } = options;

        // Validate file before upload
        const fileValidation = validateFile(file, {
            maxSize: 10 * 1024 * 1024, // 10MB max
            allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
            allowedExtensions: ['.jpg', '.jpeg', '.png', '.webp', '.gif'],
        });

        if (!fileValidation.valid) {
            return { success: false, error: fileValidation.error };
        }

        // Validate file signature (magic bytes)
        const signatureValidation = await validateFileSignature(file);
        if (!signatureValidation.valid) {
            return { success: false, error: signatureValidation.error };
        }

        try {
            // Prepare form data
            const formData = new FormData();
            formData.append('file', file);
            formData.append('upload_preset', this.uploadPreset);

            if (folder) formData.append('folder', folder);
            if (publicId) formData.append('public_id', publicId);
            if (tags && tags.length) formData.append('tags', tags.join(','));

            // Add transformation
            if (transformation) {
                const transformStr = this.buildTransformationString(transformation);
                if (transformStr) formData.append('transformation', transformStr);
            }

            // Upload with progress tracking
            const url = `https://api.cloudinary.com/v1_1/${this.cloudName}/auto/upload`;

            const xhr = new XMLHttpRequest();

            return new Promise((resolve) => {
                // Track upload progress
                if (onProgress) {
                    xhr.upload.addEventListener('progress', (e) => {
                        if (e.lengthComputable) {
                            const progress = Math.round((e.loaded / e.total) * 100);
                            onProgress(progress);
                        }
                    });
                }

                xhr.addEventListener('load', () => {
                    if (xhr.status === 200) {
                        const response = JSON.parse(xhr.responseText);
                        resolve({
                            success: true,
                            url: response.url,
                            secureUrl: response.secure_url,
                            publicId: response.public_id,
                            format: response.format,
                            width: response.width,
                            height: response.height,
                        });
                    } else {
                        resolve({
                            success: false,
                            error: `Upload failed with status ${xhr.status}`,
                        });
                    }
                });

                xhr.addEventListener('error', () => {
                    resolve({
                        success: false,
                        error: 'Network error during upload',
                    });
                });

                xhr.open('POST', url);
                xhr.send(formData);
            });
        } catch (error: any) {
            return {
                success: false,
                error: error.message || 'Upload failed',
            };
        }
    }

    /**
     * Upload image with validation
     */
    async uploadImage(file: File, options?: Omit<CloudinaryUploadOptions, 'file'>): Promise<CloudinaryUploadResult> {
        // Validate image
        const validation = this.validateImage(file);
        if (!validation.valid) {
            return { success: false, error: validation.error };
        }

        return this.uploadFile({ file, ...options });
    }

    /**
     * Upload multiple files
     */
    async uploadMultiple(files: File[], folder?: string): Promise<CloudinaryUploadResult[]> {
        const promises = files.map(file =>
            this.uploadFile({ file, folder })
        );

        return Promise.all(promises);
    }

    /**
     * Delete file from Cloudinary (requires signed request from backend)
     */
    async deleteFile(publicId: string): Promise<{ success: boolean; error?: string }> {
        // Note: Deletion requires authentication, should be done via backend
        console.warn('Cloudinary deletion should be handled by backend for security');
        return {
            success: false,
            error: 'Deletion must be handled by backend API',
        };
    }

    /**
     * Generate Cloudinary URL with transformations
     */
    getTransformedUrl(publicId: string, transformation: CloudinaryTransformation): string {
        if (!this.cloudName) {
            console.error('Cloudinary cloud name not configured');
            return '';
        }

        const transformStr = this.buildTransformationString(transformation);
        const baseUrl = `https://res.cloudinary.com/${this.cloudName}/image/upload`;
        
        return transformStr 
            ? `${baseUrl}/${transformStr}/${publicId}`
            : `${baseUrl}/${publicId}`;
    }

    /**
     * Get optimized image URL
     */
    getOptimizedUrl(publicId: string, options?: { width?: number; quality?: number | 'auto' }): string {
        const transformation: CloudinaryTransformation = {
            format: 'auto',
            quality: options?.quality || 'auto',
            ...(options?.width && { width: options.width, crop: 'scale' }),
        };

        return this.getTransformedUrl(publicId, transformation);
    }

    /**
     * Get thumbnail URL
     */
    getThumbnailUrl(publicId: string, size: number = 200): string {
        return this.getTransformedUrl(publicId, {
            width: size,
            height: size,
            crop: 'thumb',
            gravity: 'face',
            quality: 'auto',
            format: 'auto',
        });
    }

    /**
     * Get responsive srcset for images
     */
    getResponsiveSrcSet(publicId: string, widths: number[] = [320, 640, 768, 1024, 1280, 1920]): string {
        return widths
            .map(width => {
                const url = this.getTransformedUrl(publicId, {
                    width,
                    crop: 'scale',
                    quality: 'auto',
                    format: 'auto',
                });
                return `${url} ${width}w`;
            })
            .join(', ');
    }

    /**
     * Build transformation string for Cloudinary URL
     */
    private buildTransformationString(transformation: CloudinaryTransformation): string {
        const parts: string[] = [];

        if (transformation.width) parts.push(`w_${transformation.width}`);
        if (transformation.height) parts.push(`h_${transformation.height}`);
        if (transformation.crop) parts.push(`c_${transformation.crop}`);
        if (transformation.quality) parts.push(`q_${transformation.quality}`);
        if (transformation.format) parts.push(`f_${transformation.format}`);
        if (transformation.gravity) parts.push(`g_${transformation.gravity}`);

        return parts.join(',');
    }

    /**
     * Validate image file
     */
    private validateImage(file: File): { valid: boolean; error?: string } {
        const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
        
        if (!validTypes.includes(file.type)) {
            return {
                valid: false,
                error: 'Invalid image type. Allowed: JPEG, PNG, GIF, WebP, SVG',
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

    /**
     * Extract public ID from Cloudinary URL
     */
    extractPublicId(url: string): string | null {
        try {
            const regex = /\/v\d+\/(.+)\.(jpg|png|gif|webp)/;
            const match = url.match(regex);
            return match ? match[1] : null;
        } catch {
            return null;
        }
    }

    /**
     * Helper: Common image transformations
     */
    transformations = {
        avatar: (): CloudinaryTransformation => ({
            width: 200,
            height: 200,
            crop: 'fill',
            gravity: 'face',
            quality: 'auto',
            format: 'auto',
        }),
        
        productCard: (): CloudinaryTransformation => ({
            width: 400,
            height: 400,
            crop: 'fill',
            quality: 'auto',
            format: 'auto',
        }),

        productDetail: (): CloudinaryTransformation => ({
            width: 1200,
            crop: 'limit',
            quality: 'auto',
            format: 'auto',
        }),

        chatThumbnail: (): CloudinaryTransformation => ({
            width: 150,
            height: 150,
            crop: 'thumb',
            quality: 80,
            format: 'auto',
        }),

        shopLogo: (): CloudinaryTransformation => ({
            width: 300,
            height: 300,
            crop: 'fit',
            quality: 'auto',
            format: 'png',
        }),
    };
}

// Export singleton instance
export const cloudinaryService = new CloudinaryService();
export default cloudinaryService;
