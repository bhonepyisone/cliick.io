"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const supabase_js_1 = require("@supabase/supabase-js");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
const supabase = (0, supabase_js_1.createClient)(process.env.SUPABASE_URL || '', process.env.SUPABASE_SERVICE_ROLE_KEY || '');
/**
 * Grant super admin access to a user
 * POST /api/admin/grant-super-admin
 * Body: { userId: string }
 */
router.post('/grant-super-admin', auth_1.authenticateToken, async (req, res) => {
    try {
        const { userId } = req.body;
        if (!userId) {
            return res.status(400).json({ success: false, error: 'User ID is required' });
        }
        // Check if requester is a super admin
        const { data: requesterProfile } = await supabase
            .from('profiles')
            .select('is_admin')
            .eq('id', req.userId)
            .single();
        if (!requesterProfile?.is_admin) {
            return res.status(403).json({ success: false, error: 'Only super admins can grant admin access' });
        }
        // Update user to be super admin
        const { error } = await supabase
            .from('profiles')
            .update({ is_admin: true })
            .eq('id', userId);
        if (error) {
            console.error('Error granting super admin:', error);
            return res.status(500).json({ success: false, error: error.message });
        }
        console.log(`✅ Granted super admin to user ${userId}`);
        return res.json({ success: true, message: `User ${userId} is now a super admin` });
    }
    catch (error) {
        console.error('Error in grant-super-admin:', error);
        return res.status(500).json({ success: false, error: String(error) });
    }
});
/**
 * Revoke super admin access
 * POST /api/admin/revoke-super-admin
 * Body: { userId: string }
 */
router.post('/revoke-super-admin', auth_1.authenticateToken, async (req, res) => {
    try {
        const { userId } = req.body;
        if (!userId) {
            return res.status(400).json({ success: false, error: 'User ID is required' });
        }
        // Check if requester is a super admin
        const { data: requesterProfile } = await supabase
            .from('profiles')
            .select('is_admin')
            .eq('id', req.userId)
            .single();
        if (!requesterProfile?.is_admin) {
            return res.status(403).json({ success: false, error: 'Only super admins can revoke admin access' });
        }
        // Update user to not be super admin
        const { error } = await supabase
            .from('profiles')
            .update({ is_admin: false })
            .eq('id', userId);
        if (error) {
            console.error('Error revoking super admin:', error);
            return res.status(500).json({ success: false, error: error.message });
        }
        console.log(`✅ Revoked super admin from user ${userId}`);
        return res.json({ success: true, message: `User ${userId} is no longer a super admin` });
    }
    catch (error) {
        console.error('Error in revoke-super-admin:', error);
        return res.status(500).json({ success: false, error: String(error) });
    }
});
/**
 * Get list of all super admins
 * GET /api/admin/list-super-admins
 */
router.get('/list-super-admins', auth_1.authenticateToken, async (req, res) => {
    try {
        // Check if requester is a super admin
        const { data: requesterProfile } = await supabase
            .from('profiles')
            .select('is_admin')
            .eq('id', req.userId)
            .single();
        if (!requesterProfile?.is_admin) {
            return res.status(403).json({ success: false, error: 'Only super admins can view admin list' });
        }
        const { data: admins, error } = await supabase
            .from('profiles')
            .select('id, username, email, is_admin')
            .eq('is_admin', true);
        if (error) {
            console.error('Error fetching super admins:', error);
            return res.status(500).json({ success: false, error: error.message });
        }
        return res.json({ success: true, data: admins });
    }
    catch (error) {
        console.error('Error in list-super-admins:', error);
        return res.status(500).json({ success: false, error: String(error) });
    }
});
exports.default = router;
