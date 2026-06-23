import BaseRepository from '../../db/base.repository.js';
import pool from '../../db/index.js';

class PaymentsRepository extends BaseRepository {
  constructor() {
    super('payments');
  }

  async findByInvoiceId(invoiceId) {
    const result = await pool.query(
      `SELECT * FROM payments WHERE invoice_id = $1 ORDER BY paid_at DESC`,
      [invoiceId]
    );
    return result.rows;
  }
}

export default new PaymentsRepository();
