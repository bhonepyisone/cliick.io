"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const router = express_1.default.Router();
router.post('/stripe', async (req, res) => {
    try {
        res.status(200).json({ success: true, message: 'Webhook received' });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
router.post('/paypal', async (req, res) => {
    try {
        res.status(200).json({ success: true, message: 'Webhook received' });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
module.exports = router;
