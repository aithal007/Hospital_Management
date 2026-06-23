import { Router } from 'express';
import healthRouter from './health.js';
import authRouter from '../modules/auth/auth.routes.js';
import patientsRouter from '../modules/patients/patients.routes.js';
import doctorsRouter from '../modules/doctors/doctors.routes.js';
import billingRouter from '../modules/billing/billing.routes.js';
import notificationsRouter from '../modules/notifications/notifications.routes.js';
import queuesRouter from './queues.js';

const router = Router();

// Mount sub-routers
router.use('/health', healthRouter);
router.use('/auth', authRouter);
router.use('/patients', patientsRouter);
router.use('/doctors', doctorsRouter);
router.use('/billing', billingRouter);
router.use('/notifications', notificationsRouter);
router.use('/admin/queues', queuesRouter.getRouter());

export default router;
