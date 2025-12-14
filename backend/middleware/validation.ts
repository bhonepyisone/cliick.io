import Joi from 'joi';

// Shop validation schema
export const shopSchema = Joi.object({
  name: Joi.string().min(1).max(100).required(),
  description: Joi.string().max(500).optional(),
  currency: Joi.string().length(3).optional(),
  assistant_model: Joi.string().valid('STANDARD', 'ADVANCED', 'DEEP_THINKING').optional(),
  system_prompt: Joi.string().max(1000).optional(),
  response_delay: Joi.number().min(0).max(5000).optional(),
});

// User validation schema
export const userSchema = Joi.object({
  username: Joi.string().min(3).max(30).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).max(100).required(),
});

// Item validation schema
export const itemSchema = Joi.object({
  name: Joi.string().min(1).max(100).required(),
  description: Joi.string().max(500).optional(),
  retail_price: Joi.number().min(0).required(),
  stock: Joi.number().min(0).required(),
  category: Joi.string().max(50).optional(),
});

// Form validation schema
export const formSchema = Joi.object({
  name: Joi.string().min(1).max(100).required(),
  fields: Joi.array().items(Joi.object({
    id: Joi.string().required(),
    label: Joi.string().required(),
    type: Joi.string().valid('text', 'number', 'email', 'textarea', 'select', 'checkbox', 'radio').required(),
    required: Joi.boolean().optional(),
    options: Joi.array().items(Joi.string()).optional(),
  })).optional(),
});

// Form submission validation schema
export const formSubmissionSchema = Joi.object({
  form_id: Joi.string().required(),
  form_name: Joi.string().required(),
  status: Joi.string().valid('pending', 'confirmed', 'completed', 'cancelled', 'return').optional(),
  ordered_products: Joi.array().items(Joi.object({
    id: Joi.string().required(),
    name: Joi.string().required(),
    quantity: Joi.number().min(1).required(),
    price: Joi.number().min(0).required(),
  })).optional(),
  payment_method: Joi.string().optional(),
  discount: Joi.object({
    type: Joi.string().valid('percentage', 'fixed').required(),
    value: Joi.number().min(0).required(),
  }).optional(),
});

// Message validation schema
export const messageSchema = Joi.object({
  text: Joi.string().max(1000).required(),
  sender: Joi.string().valid('customer', 'seller').required(),
  senderId: Joi.string().required(),
});

// Conversation validation schema
export const conversationSchema = Joi.object({
  customer_name: Joi.string().min(1).max(100).required(),
  platform: Joi.string().valid('web', 'facebook', 'instagram', 'tiktok', 'telegram', 'viber').required(),
  status: Joi.string().valid('open', 'pending', 'closed').optional(),
});

// Validate request body against schema
export const validateBody = (schema: Joi.ObjectSchema) => {
  return (req: any, res: any, next: any) => {
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

// Validate request params against schema
export const validateParams = (schema: Joi.ObjectSchema) => {
  return (req: any, res: any, next: any) => {
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

// Validate request query against schema
export const validateQuery = (schema: Joi.ObjectSchema) => {
  return (req: any, res: any, next: any) => {
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