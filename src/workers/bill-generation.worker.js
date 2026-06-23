import { Worker } from 'bullmq';
import { queueConnection } from '../db/queue.js';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

const billsDir = path.resolve('temp_bills');

export const billGenerationWorker = new Worker(
  'bill-generation',
  async (job) => {
    const { appointmentId, patientName, consultationFee, doctorName, date } = job.data;
    console.log(
      `[Worker] Processing bill generation job ${job.id} for appointment ${appointmentId}`
    );

    if (!fs.existsSync(billsDir)) {
      fs.mkdirSync(billsDir, { recursive: true });
    }

    const filePath = path.join(billsDir, `invoice-${appointmentId || job.id}.pdf`);

    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50 });
        const writeStream = fs.createWriteStream(filePath);

        doc.pipe(writeStream);

        doc.fillColor('#0ea5e9').fontSize(24).text('CareFlow HMS', { align: 'center' });
        doc.moveDown(0.5);
        doc.fillColor('#64748b').fontSize(12).text('INVOICE / RECEIPT', { align: 'center' });
        doc.moveDown(1.5);

        doc.strokeColor('#cbd5e1').lineWidth(1).moveTo(50, 120).lineTo(550, 120).stroke();
        doc.moveDown(1.5);

        doc.fillColor('#1e293b').fontSize(12);
        doc.text(`Invoice ID: INV-${appointmentId || job.id}`);
        doc.text(`Date Generated: ${new Date().toLocaleDateString()}`);
        doc.moveDown();

        doc.fillColor('#1e293b');
        doc.text(`Patient Name: ${patientName || 'Anonymous Patient'}`);
        doc.text(`Consulting Doctor: ${doctorName || 'General Staff'}`);
        doc.text(`Appointment Date: ${date || 'N/A'}`);
        doc.moveDown(2);

        doc.fillColor('#0f172a').fontSize(14).text('Services Rendered', { underline: true });
        doc.moveDown();

        doc.fontSize(12);
        doc.text('Consultation Fee:', 100, doc.y, { width: 300 });
        doc.text(`$${(consultationFee || 0).toFixed(2)}`, 400, doc.y - 12, {
          width: 100,
          align: 'right',
        });
        doc.moveDown(1.5);

        doc.strokeColor('#e2e8f0').lineWidth(1).moveTo(100, doc.y).lineTo(500, doc.y).stroke();
        doc.moveDown(1);
        doc.fontSize(14).fillColor('#0ea5e9').text('Total Amount Due:', 100, doc.y, { width: 300 });
        doc.text(`$${(consultationFee || 0).toFixed(2)}`, 400, doc.y - 14, {
          width: 100,
          align: 'right',
        });

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
          console.log(`[Worker] PDF successfully generated at: ${filePath}`);
          resolve({ success: true, filePath });
        });

        writeStream.on('error', (err) => {
          reject(err);
        });
      } catch (err) {
        reject(err);
      }
    });
  },
  {
    connection: queueConnection,
  }
);

billGenerationWorker.on('completed', (job) => {
  console.log(`[Worker] Bill generation job ${job.id} completed successfully.`);
});

billGenerationWorker.on('failed', (job, err) => {
  console.error(`[Worker] Bill generation job ${job.id} failed with error:`, err.message);
});
