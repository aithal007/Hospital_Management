import BaseRepository from '../../db/base.repository.js';

class BillingRepository extends BaseRepository {
  constructor() {
    super('invoices'); // Table to be created in a later step
  }
}

const billingRepository = new BillingRepository();
export default billingRepository;
