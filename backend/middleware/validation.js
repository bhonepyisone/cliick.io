"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateQuery = exports.validateParams = exports.validateBody = exports.conversationSchema = exports.messageSchema = exports.formSubmissionSchema = exports.formSchema = exports.itemSchema = exports.userSchema = exports.shopSchema = void 0;
const joi_1 = __importDefault(require("joi"));
// Shop validation schema
exports.shopSchema = joi_1.default.object({
    name: joi_1.default.string().min(1).max(100).required(),
    description: joi_1.default.string().max(500).optional(),
    currency: joi_1.default.string().length(3).optional(),
    assistant_model: joi_1.default.string().valid('STANDARD', 'ADVANCED', 'DEEP_THINKING').optional(),
    system_prompt: joi_1.default.string().max(1000).optional(),
    response_delay: joi_1.default.number().min(0).max(5000).optional(),
});
// User validation schema
exports.userSchema = joi_1.default.object({
    username: joi_1.default.string().min(3).max(30).required(),
    email: joi_1.default.string().email().required(),
    password: joi_1.default.string().min(6).max(100).required(),
});
// Item validation schema
exports.itemSchema = joi_1.default.object({
    name: joi_1.default.string().min(1).max(100).required(),
    description: joi_1.default.string().max(500).optional(),
    retail_price: joi_1.default.number().min(0).required(),
    stock: joi_1.default.number().min(0).required(),
    category: joi_1.default.string().max(50).optional(),
});
// Form validation schema
exports.formSchema = joi_1.default.object({
    name: joi_1.default.string().min(1).max(100).required(),
    fields: joi_1.default.array().items(joi_1.default.object({
        id: joi_1.default.string().required(),
        label: joi_1.default.string().required(),
        type: joi_1.default.string().valid('text', 'number', 'email', 'textarea', 'select', 'checkbox', 'radio').required(),
        required: joi_1.default.boolean().optional(),
        options: joi_1.default.array().items(joi_1.default.string()).optional(),
    })).optional(),
});
// Form submission validation schema
exports.formSubmissionSchema = joi_1.default.object({
    form_id: joi_1.default.string().required(),
    form_name: joi_1.default.string().required(),
    status: joi_1.default.string().valid('pending', 'confirmed', 'completed', 'cancelled', 'return').optional(),
    ordered_products: joi_1.default.array().items(joi_1.default.object({
        id: joi_1.default.string().required(),
        name: joi_1.default.string().required(),
        quantity: joi_1.default.number().min(1).required(),
        price: joi_1.default.number().min(0).required(),
    })).optional(),
    payment_method: joi_1.default.string().optional(),
    discount: joi_1.default.object({
        type: joi_1.default.string().valid('percentage', 'fixed').required(),
        value: joi_1.default.number().min(0).required(),
    }).optional(),
});
// Message validation schema
exports.messageSchema = joi_1.default.object({
    text: joi_1.default.string().max(1000).required(),
    sender: joi_1.default.string().valid('customer', 'seller').required(),
    senderId: joi_1.default.string().required(),
});
// Conversation validation schema
exports.conversationSchema = joi_1.default.object({
    customer_name: joi_1.default.string().min(1).max(100).required(),
    platform: joi_1.default.string().valid('web', 'facebook', 'instagram', 'tiktok', 'telegram', 'viber').required(),
    status: joi_1.default.string().valid('open', 'pending', 'closed').optional(),
});
// Validate request body against schema
const validateBody = (schema) => {
    return (req, res, next) => {
        const { error } = schema.validate(req.body);
        if (error) {
            return res.status(400).json({
                success: false,
                error: error.details[0].message,
            });
        }
        next();
    };
};
exports.validateBody = validateBody;
// Validate request params against schema
const validateParams = (schema) => {
    return (req, res, next) => {
        const { error } = schema.validate(req.params);
        if (error) {
            return res.status(400).json({
                success: false,
                error: error.details[0].message,
            });
        }
        next();
    };
};
exports.validateParams = validateParams;
// Validate request query against schema
const validateQuery = (schema) => {
    return (req, res, next) => {
        const { error } = schema.validate(req.query);
        if (error) {
            return res.status(400).json({
                success: false,
                error: error.details[0].message,
            });
        }
        next();
    };
};
exports.validateQuery = validateQuery;
