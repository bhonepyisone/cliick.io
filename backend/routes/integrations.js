"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router({ mergeParams: true });
router.get('/', async (req, res) => {
    try {
        res.status(200).json({ success: true, data: [{ platform: 'facebook', status: 'active' }, { platform: 'instagram', status: 'inactive' }, { platform: 'tiktok', status: 'inactive' }, { platform: 'telegram', status: 'inactive' }, { platform: 'viber', status: 'inactive' }] });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
router.get('/:platform', async (req, res) => {
    try {
        const { platform } = req.params;
        res.status(200).json({ success: true, data: { platform, status: 'active' } });
    }
    catch (error) {
        res.status(404).json({ success: false, error: 'Not found' });
    }
});
router.post('/:platform/connect', auth_1.authenticateToken, async (req, res) => {
    try {
        const { platform } = req.params;
        const { code } = req.body;
        if (!code)
            return res.status(400).json({ success: false, error: 'Code required' });
        res.status(200).json({ success: true, data: { platform, status: 'active' } });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
router.post('/:platform/disconnect', auth_1.authenticateToken, async (req, res) => {
    try {
        const { platform } = req.params;
        res.status(200).json({ success: true, data: { platform, status: 'inactive' } });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
module.exports = router;
