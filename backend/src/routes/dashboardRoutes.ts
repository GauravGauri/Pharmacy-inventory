import { Router } from 'express';
import { getDashboardStats, getSalesChartData } from '../controllers/dashboardController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

router.use(authenticateToken); // Protect dashboard routes

router.get('/stats', getDashboardStats);
router.get('/sales-chart', getSalesChartData);

export default router;
