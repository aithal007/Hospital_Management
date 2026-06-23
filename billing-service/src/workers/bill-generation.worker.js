import { Worker } from 'bullmq';
import { queueConnection } from '../db/queue.js';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const billsDir = path.resolve(__dirname, '../../temp_bills');

export const billGenerationWorker = new Worker(
  'bill-generation',
  async (job) => {
    const { invoiceId, appointmentId, patientName, doctorName, consultationFee, date, status } =
      job.data;

    console.log(`[BillWorker] Processing job ${job.id} for invoice ${invoiceId}`);

    if (!fs.existsSync(billsDir)) {
      fs.mkdirSync(billsDir, { recursive: true });
    }

    const filePath = path.join(billsDir, `invoice-${invoiceId}.pdf`);

    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50 });
        const writeStream = fs.createWriteStream(filePath);

        doc.pipe(writeStream);

        // ── Header ───────────────────────────────────────────────────────────
        doc.fillColor('#0ea5e9').fontSize(24).text('CareFlow HMS', { align: 'center' });
        doc.moveDown(0.5);
        doc.fillColor('#64748b').fontSize(12).text('INVOICE / RECEIPT', { align: 'center' });
        doc.moveDown(1.5);

        doc.strokeColor('#cbd5e1').lineWidth(1).moveTo(50, 120).lineTo(550, 120).stroke();
        doc.moveDown(1.5);

        // ── Invoice meta ─────────────────────────────────────────────────────
        doc.fillColor('#1e293b').fontSize(12);
        doc.text(`Invoice ID:       INV-${invoiceId}`);
        doc.text(`Appointment ID:   ${appointmentId || 'N/A'}`);
        doc.text(`Status:           ${(status || 'pending').toUpperCase()}`);
        doc.text(`Date Generated:   ${new Date().toLocaleDateString()}`);
        doc.moveDown();

        // ── Patient / Doctor ─────────────────────────────────────────────────
        doc.text(`Patient Name:     ${patientName || 'Anonymous Patient'}`);
        doc.text(`Consulting Doctor:${doctorName || 'General Staff'}`);
        doc.text(`Appointment Date: ${date || 'N/A'}`);
        doc.moveDown(2);

        // ── Services table ───────────────────────────────────────────────────
        doc.fillColor('#0f172a').fontSize(14).text('Services Rendered', { underline: true });
        doc.moveDown();

        doc.fontSize(12).fillColor('#1e293b');
        doc.text('Consultation Fee:', 100, doc.y, { width: 300 });
        doc.text(`$${parseFloat(consultationFee || 0).toFixed(2)}`, 400, doc.y - 12, {
          width: 100,
          align: 'right',
        });
        doc.moveDown(1.5);

        doc.strokeColor('#e2e8f0').lineWidth(1).moveTo(100, doc.y).lineTo(500, doc.y).stroke();
        doc.moveDown(1);

        doc.fontSize(14).fillColor('#0ea5e9').text('Total Amount Due:', 100, doc.y, { width: 300 });
        doc.text(`$${parseFloat(consultationFee || 0).toFixed(2)}`, 400, doc.y - 14, {
          width: 100,
          align: 'right',
        });

        // ── Footer ───────────────────────────────────────────────────────────
        doc.moveDown(3);
        doc
          .fontSize(10)
          .fillColor('#64748b')
          .text(
            'Thank you for choosing CareFlow HMS. For billing queries, contact support@careflowhms.com',
            { align: 'center' }
          );

        doc.end();

        writeStream.on('finish', () => {
          console.log(`[BillWorker] PDF saved at: ${filePath}`);
          resolve({ success: true, filePath });
        });

        writeStream.on('error', reject);
      } catch (err) {
        reject(err);
      }
    });
  },
  { connection: queueConnection }
);

billGenerationWorker.on('completed', (job) => {
  console.log(`[BillWorker] Job ${job.id} completed.`);
});

billGenerationWorker.on('failed', (job, err) => {
  console.error(`[BillWorker] Job ${job.id} failed:`, err.message);
});
