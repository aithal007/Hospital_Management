import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;

const coreUrl = process.env.CORE_APP_URL || 'http://app-monolith:5000';
const appointmentUrl = process.env.APPOINTMENT_SERVICE_URL || 'http://appointment-service:3020';
const billingUrl = process.env.BILLING_SERVICE_URL || 'http://billing-service:3011';
const prescriptionUrl = process.env.PRESCRIPTION_SERVICE_URL || 'http://prescription-service:3012';
const insuranceUrl = process.env.INSURANCE_SERVICE_URL || 'http://insurance-service:3013';

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', createProxyMiddleware({ target: coreUrl, changeOrigin: true }));
app.use('/api/patients', createProxyMiddleware({ target: coreUrl, changeOrigin: true }));
app.use('/api/doctors', createProxyMiddleware({ target: coreUrl, changeOrigin: true }));
app.use('/api/appointments', createProxyMiddleware({ target: appointmentUrl, changeOrigin: true }));
app.use('/api/billing', createProxyMiddleware({ target: billingUrl, changeOrigin: true }));
app.use('/api/prescriptions', createProxyMiddleware({ target: prescriptionUrl, changeOrigin: true }));
app.use('/api/insurance', createProxyMiddleware({ target: insuranceUrl, changeOrigin: true }));

app.listen(PORT, () => {
  console.log(`API Gateway running on port ${PORT}`);
});
