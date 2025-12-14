"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router({ mergeParams: true });
router.post('/intent', auth_1.authenticateToken, async (req, res) => {
    try {
        const { orderId, amount } = req.body;
        if (!orderId || !amount || amount <= 0)
            return res.status(400).json({ success: false, error: 'Invalid data' });
        res.status(200).json({
            success: true,
            data: {
                paymentIntentId: 'pi_' + Date.now(),
                clientSecret: 'cs_' + Date.now(),
                amount
            }
        });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
router.post('/confirm', auth_1.authenticateToken, async (req, res) => {
    try {
        const { paymentIntentId } = req.body;
        if (!paymentIntentId)
            return res.status(400).json({ success: false, error: 'Missing ID' });
        res.status(200).json({ success: true, data: { status: 'succeeded' } });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
router.get('/:paymentId', async (req, res) => {
    try {
        res.status(200).json({ success: true, data: { status: 'succeeded' } });
    }
    catch (error) {
        res.status(404).json({ success: false, error: 'Not found' });
    }
});
router.post('/:paymentId/refund', auth_1.authenticateToken, async (req, res) => {
    try {
        res.status(200).json({ success: true, data: { status: 'succeeded' } });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
module.exports = router;
