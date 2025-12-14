"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const supabase_1 = require("../config/supabase");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router({ mergeParams: true });
// File upload configuration
const uploadConfig = {
    maxFileSize: 50 * 1024 * 1024, // 50MB
    allowedMimeTypes: [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'video/mp4',
        'video/webm',
        'audio/mpeg',
        'audio/wav'
    ],
    storageBucket: process.env.SUPABASE_STORAGE_BUCKET || 'file-uploads'
};
// POST /shops/:shopId/uploads - Upload file
router.post('/', auth_1.authenticateToken, async (req, res, next) => {
    try {
        const { shopId } = req.params;
        const userId = req.headers['x-user-id'];
        // Note: In production, use multer middleware to handle file uploads
        // This is a skeleton for the endpoint structure
        if (!req.body.file || !req.body.filename) {
            return res.status(400).json({ success: false, error: 'File and filename required' });
        }
        const { file, filename, mimeType, description } = req.body;
        // Validate file
        if (Buffer.byteLength(file) > uploadConfig.maxFileSize) {
            return res.status(413).json({ success: false, error: `File exceeds maximum size of ${uploadConfig.maxFileSize / 1024 / 1024}MB` });
        }
        if (!uploadConfig.allowedMimeTypes.includes(mimeType)) {
            return res.status(400).json({ success: false, error: 'File type not allowed' });
        }
        // Generate unique filename
        const timestamp = Date.now();
        const fileExtension = filename.split('.').pop();
        const uniqueFilename = `${shopId}/${userId}/${timestamp}.${fileExtension}`;
        // Upload to Supabase Storage
        const { data: storageData, error: storageError } = await supabase_1.supabase.storage
            .from(uploadConfig.storageBucket)
            .upload(uniqueFilename, file, {
            contentType: mimeType,
            upsert: false
        });
        if (storageError) {
            return res.status(500).json({ success: false, error: 'File upload failed' });
        }
        // Get public URL
        const { data: urlData } = supabase_1.supabase.storage
            .from(uploadConfig.storageBucket)
            .getPublicUrl(uniqueFilename);
        // Store file metadata in database
        const { data: fileData, error: dbError } = await supabase_1.supabase
            .from('file_uploads')
            .insert([{
                shop_id: shopId,
                user_id: userId,
                filename: filename,
                storage_path: uniqueFilename,
                file_size: Buffer.byteLength(file),
                mime_type: mimeType,
                url: urlData.publicUrl,
                description: description || null,
                uploaded_at: new Date().toISOString()
            }])
            .select()
            .single();
        if (dbError)
            throw dbError;
        res.status(201).json({
            success: true,
            data: {
                id: fileData.id,
                filename: fileData.filename,
                url: fileData.url,
                size: fileData.file_size,
                mimeType: fileData.mime_type,
                uploadedAt: fileData.uploaded_at
            }
        });
    }
    catch (error) {
        next(error);
    }
});
// GET /shops/:shopId/uploads - List uploaded files
router.get('/', auth_1.authenticateToken, async (req, res, next) => {
    try {
        const { shopId } = req.params;
        const { limit = 50, offset = 0, type } = req.query;
        let query = supabase_1.supabase
            .from('file_uploads')
            .select('*', { count: 'exact' })
            .eq('shop_id', shopId);
        if (type) {
            query = query.eq('mime_type', type);
        }
        const { data, count, error } = await query
            .order('uploaded_at', { ascending: false })
            .range(offset, offset + limit - 1);
        if (error)
            throw error;
        res.status(200).json({
            success: true,
            data: data || [],
            pagination: { limit: Number(limit), offset: Number(offset), total: count }
        });
    }
    catch (error) {
        next(error);
    }
});
// GET /shops/:shopId/uploads/:fileId - Get file details
router.get('/:fileId', auth_1.authenticateToken, async (req, res, next) => {
    try {
        const { shopId, fileId } = req.params;
        const { data, error } = await supabase_1.supabase
            .from('file_uploads')
            .select('*')
            .eq('id', fileId)
            .eq('shop_id', shopId)
            .single();
        if (error || !data) {
            return res.status(404).json({ success: false, error: 'File not found' });
        }
        res.status(200).json({
            success: true,
            data: {
                id: data.id,
                filename: data.filename,
                url: data.url,
                size: data.file_size,
                mimeType: data.mime_type,
                description: data.description,
                uploadedAt: data.uploaded_at
            }
        });
    }
    catch (error) {
        next(error);
    }
});
// PUT /shops/:shopId/uploads/:fileId - Update file metadata
router.put('/:fileId', auth_1.authenticateToken, async (req, res, next) => {
    try {
        const { shopId, fileId } = req.params;
        const { description } = req.body;
        const { data, error } = await supabase_1.supabase
            .from('file_uploads')
            .update({ description })
            .eq('id', fileId)
            .eq('shop_id', shopId)
            .select()
            .single();
        if (error)
            throw error;
        res.status(200).json({
            success: true,
            data: {
                id: data.id,
                filename: data.filename,
                description: data.description
            }
        });
    }
    catch (error) {
        next(error);
    }
});
// DELETE /shops/:shopId/uploads/:fileId - Delete file
router.delete('/:fileId', auth_1.authenticateToken, async (req, res, next) => {
    try {
        const { shopId, fileId } = req.params;
        // Get file details first
        const { data: fileData } = await supabase_1.supabase
            .from('file_uploads')
            .select('storage_path')
            .eq('id', fileId)
            .eq('shop_id', shopId)
            .single();
        if (!fileData) {
            return res.status(404).json({ success: false, error: 'File not found' });
        }
        // Delete from storage
        await supabase_1.supabase.storage
            .from(uploadConfig.storageBucket)
            .remove([fileData.storage_path]);
        // Delete from database
        const { error } = await supabase_1.supabase
            .from('file_uploads')
            .delete()
            .eq('id', fileId)
            .eq('shop_id', shopId);
        if (error)
            throw error;
        res.status(200).json({ success: true, message: 'File deleted successfully' });
    }
    catch (error) {
        next(error);
    }
});
// POST /shops/:shopId/uploads/bulk - Bulk delete files
router.post('/bulk/delete', auth_1.authenticateToken, async (req, res, next) => {
    try {
        const { shopId } = req.params;
        const { fileIds } = req.body;
        if (!fileIds || !Array.isArray(fileIds) || fileIds.length === 0) {
            return res.status(400).json({ success: false, error: 'File IDs array required' });
        }
        // Get storage paths
        const { data: files } = await supabase_1.supabase
            .from('file_uploads')
            .select('id, storage_path')
            .eq('shop_id', shopId)
            .in('id', fileIds);
        if (files && files.length > 0) {
            // Delete from storage
            const storagePaths = files.map(f => f.storage_path);
            await supabase_1.supabase.storage
                .from(uploadConfig.storageBucket)
                .remove(storagePaths);
        }
        // Delete from database
        const { error } = await supabase_1.supabase
            .from('file_uploads')
            .delete()
            .eq('shop_id', shopId)
            .in('id', fileIds);
        if (error)
            throw error;
        res.status(200).json({
            success: true,
            message: `${fileIds.length} files deleted successfully`
        });
    }
    catch (error) {
        next(error);
    }
});
// GET /shops/:shopId/uploads/storage/usage - Get storage usage
router.get('/storage/usage', auth_1.authenticateToken, async (req, res, next) => {
    try {
        const { shopId } = req.params;
        const { data: files } = await supabase_1.supabase
            .from('file_uploads')
            .select('file_size')
            .eq('shop_id', shopId);
        const totalSize = files?.reduce((sum, f) => sum + (f.file_size || 0), 0) || 0;
        const totalFiles = files?.length || 0;
        const usagePercentage = (totalSize / (100 * 1024 * 1024)) * 100; // Assuming 100MB quota
        res.status(200).json({
            success: true,
            data: {
                totalSize,
                totalFiles,
                usagePercentage,
                quotaMB: 100,
                usedMB: Math.round(totalSize / 1024 / 1024)
            }
        });
    }
    catch (error) {
        next(error);
    }
});
module.exports = router;
