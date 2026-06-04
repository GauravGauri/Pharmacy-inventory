import { Router } from 'express';
import {
  createPurchaseInvoice,
  getPurchaseInvoices,
  getPurchaseInvoiceById,
  createSalesInvoice,
  getSalesInvoices,
  getSalesInvoiceById,
} from '../controllers/transactionController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

router.use(authenticateToken); // Protect all transaction routes

router.post('/purchases', createPurchaseInvoice);
router.get('/purchases', getPurchaseInvoices);
router.get('/purchases/:id', getPurchaseInvoiceById);

router.post('/sales', createSalesInvoice);
router.get('/sales', getSalesInvoices);
router.get('/sales/:id', getSalesInvoiceById);

export default router;
