import { Router } from 'express';
import { DatabaseController } from '../controllers/databaseController';

const router = Router();
const databaseController = new DatabaseController();

export default router; 