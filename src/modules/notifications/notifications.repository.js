import BaseRepository from '../../db/base.repository.js';

class NotificationsRepository extends BaseRepository {
  constructor() {
    super('notifications'); // Table to be created in a later step
  }
}

const notificationsRepository = new NotificationsRepository();
export default notificationsRepository;
