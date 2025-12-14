import express, { Router, Request, Response } from 'express';

const router: Router = express.Router();

router.post('/stripe', async (req: Request, res: Response) => {
  try {
    res.status(200).json({ success: true, message: 'Webhook received' });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as any).message });
  }
});

router.post('/paypal', async (req: Request, res: Response) => {
  try {
    res.status(200).json({ success: true, message: 'Webhook received' });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as any).message });
  }
});

module.exports = router;
