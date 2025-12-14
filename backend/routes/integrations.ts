import express, { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';

const router: Router = express.Router({ mergeParams: true });

router.get('/', async (req: Request, res: Response) => {
  try {
    res.status(200).json({ success: true, data: [{ platform: 'facebook', status: 'active' }, { platform: 'instagram', status: 'inactive' }, { platform: 'tiktok', status: 'inactive' }, { platform: 'telegram', status: 'inactive' }, { platform: 'viber', status: 'inactive' }] });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as any).message });
  }
});

router.get('/:platform', async (req: Request, res: Response) => {
  try {
    const { platform } = req.params;
    res.status(200).json({ success: true, data: { platform, status: 'active' } });
  } catch (error) {
    res.status(404).json({ success: false, error: 'Not found' });
  }
});

router.post('/:platform/connect', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { platform } = req.params;
    const { code } = req.body;
    if (!code) return res.status(400).json({ success: false, error: 'Code required' });
    res.status(200).json({ success: true, data: { platform, status: 'active' } });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as any).message });
  }
});

router.post('/:platform/disconnect', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { platform } = req.params;
    res.status(200).json({ success: true, data: { platform, status: 'inactive' } });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as any).message });
  }
});

module.exports = router;
