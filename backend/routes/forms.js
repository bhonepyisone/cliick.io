"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const supabase_1 = require("../config/supabase");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router({ mergeParams: true });
router.get('/', async (req, res, next) => {
    const { shopId } = req.params;
    try {
        const { data, error } = await supabase_1.supabase.from('forms').select('*').eq('shop_id', shopId);
        if (error)
            throw error;
        res.status(200).json({ success: true, data: data || [] });
    }
    catch (error) {
        next(error);
    }
});
router.post('/', auth_1.authenticateToken, async (req, res, next) => {
    const { shopId } = req.params;
    try {
        const { name, fields, description } = req.body;
        // Validate form name
        if (!name || name.trim().length === 0) {
            return res.status(400).json({ success: false, error: 'Form name is required' });
        }
        if (name.length > 255) {
            return res.status(400).json({ success: false, error: 'Form name cannot exceed 255 characters' });
        }
        // Validate fields if provided
        if (fields && Array.isArray(fields)) {
            for (let i = 0; i < fields.length; i++) {
                const field = fields[i];
                if (!field.name || field.name.trim().length === 0) {
                    return res.status(400).json({ success: false, error: `Field ${i + 1}: name is required` });
                }
                if (!field.type || !['text', 'email', 'number', 'date', 'checkbox', 'select', 'textarea'].includes(field.type)) {
                    return res.status(400).json({ success: false, error: `Field ${i + 1}: invalid type` });
                }
                if (field.required && typeof field.required !== 'boolean') {
                    return res.status(400).json({ success: false, error: `Field ${i + 1}: required must be boolean` });
                }
            }
        }
        const { data, error } = await supabase_1.supabase
            .from('forms')
            .insert([{ shop_id: shopId, name: name.trim(), description, fields: fields || [] }])
            .select()
            .single();
        if (error)
            throw error;
        res.status(201).json({ success: true, data });
    }
    catch (error) {
        next(error);
    }
});
router.put('/:formId', auth_1.authenticateToken, async (req, res, next) => {
    const { shopId, formId } = req.params;
    const { name, description } = req.body;
    try {
        const { data, error } = await supabase_1.supabase.from('forms').update({ name, description, updated_at: new Date().toISOString() }).eq('id', formId).eq('shop_id', shopId).select().single();
        if (error)
            throw error;
        res.status(200).json({ success: true, data });
    }
    catch (error) {
        next(error);
    }
});
router.delete('/:formId', auth_1.authenticateToken, async (req, res, next) => {
    const { shopId, formId } = req.params;
    try {
        const { error } = await supabase_1.supabase.from('forms').delete().eq('id', formId).eq('shop_id', shopId);
        if (error)
            throw error;
        res.status(200).json({ success: true, message: 'Form deleted successfully' });
    }
    catch (error) {
        next(error);
    }
});
router.post('/:formId/submissions', async (req, res, next) => {
    const { shopId, formId } = req.params;
    const { data: submissionData, status } = req.body;
    try {
        // Validate submission data
        if (!submissionData || typeof submissionData !== 'object') {
            return res.status(400).json({ success: false, error: 'Form data must be a valid object' });
        }
        // Get the form to validate against its fields
        const { data: form } = await supabase_1.supabase
            .from('forms')
            .select('fields')
            .eq('id', formId)
            .eq('shop_id', shopId)
            .single();
        if (!form) {
            return res.status(404).json({ success: false, error: 'Form not found' });
        }
        // Validate required fields if form has field definitions
        if (form.fields && Array.isArray(form.fields)) {
            for (const field of form.fields) {
                if (field.required) {
                    const value = submissionData[field.name];
                    if (value === undefined || value === null || value === '') {
                        return res.status(400).json({ success: false, error: `Field "${field.name}" is required` });
                    }
                }
                // Validate field type if present in submission
                if (submissionData[field.name] !== undefined && submissionData[field.name] !== null) {
                    const value = submissionData[field.name];
                    if (field.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
                        return res.status(400).json({ success: false, error: `Field "${field.name}" must be a valid email` });
                    }
                    if (field.type === 'number' && isNaN(Number(value))) {
                        return res.status(400).json({ success: false, error: `Field "${field.name}" must be a number` });
                    }
                    if (field.type === 'date') {
                        const dateValue = new Date(value);
                        if (isNaN(dateValue.getTime())) {
                            return res.status(400).json({ success: false, error: `Field "${field.name}" must be a valid date` });
                        }
                    }
                }
            }
        }
        const { data: insertedData, error } = await supabase_1.supabase
            .from('form_submissions')
            .insert([{ form_id: formId, shop_id: shopId, data: submissionData || {}, status: status || 'Pending', submitted_at: new Date().toISOString() }])
            .select()
            .single();
        if (error)
            throw error;
        res.status(201).json({ success: true, data: insertedData });
    }
    catch (error) {
        next(error);
    }
});
module.exports = router;
