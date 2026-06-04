import { Router } from 'express';
import { createSupplier, getSuppliers, updateSupplier, deleteSupplier } from '../controllers/supplierController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

router.use(authenticateToken); // Protect all supplier routes

router.post('/', createSupplier);
router.get('/', getSuppliers);
router.put('/:id', updateSupplier);
router.delete('/:id', deleteSupplier);

export default router;
