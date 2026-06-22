import { Router } from 'express';
import healthRouter from './health.js';
import authRouter from './auth.js';
import patientsRouter from './patients.js';
import doctorsRouter from './doctors.js';
import appointmentsRouter from './appointments.js';

const router = Router();

// Mount sub-routers
router.use('/health', healthRouter);
router.use('/auth', authRouter);
router.use('/patients', patientsRouter);
router.use('/doctors', doctorsRouter);
router.use('/appointments', appointmentsRouter);

export default router;

