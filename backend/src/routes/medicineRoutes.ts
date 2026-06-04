import { Router } from 'express';
import {
  createMedicine,
  getMedicines,
  getMedicineById,
  updateMedicine,
  deleteMedicine,
  getBatches,
  adjustBatchStock,
} from '../controllers/medicineController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

router.use(authenticateToken); // Protect all medicine/batch routes

router.post('/', createMedicine);
router.get('/', getMedicines);
router.get('/batches', getBatches);
router.put('/batches/:batchId', adjustBatchStock);
router.get('/:id', getMedicineById);
router.put('/:id', updateMedicine);
router.delete('/:id', deleteMedicine);

export default router;
