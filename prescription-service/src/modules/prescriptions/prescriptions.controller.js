import * as prescriptionsService from './prescriptions.service.js';

export const createPrescriptionHandler = async (req, res, next) => {
  const { appointment_id, notes, items } = req.body;

  try {
    const prescription = await prescriptionsService.createPrescription({
      user: req.user,
      authToken: req.headers.authorization,
      appointment_id,
      notes,
      items,
    });

    return res.status(201).json({
      status: 'success',
      message: 'Prescription created successfully',
      data: prescription,
    });
  } catch (error) {
    next(error);
  }
};

export const getPrescriptionByIdHandler = async (req, res, next) => {
  try {
    const prescription = await prescriptionsService.getPrescriptionById(req.params.id, {
      user: req.user,
      authToken: req.headers.authorization,
    });

    return res.status(200).json({
      status: 'success',
      data: prescription,
    });
  } catch (error) {
    next(error);
  }
};

export const getPrescriptionsHandler = async (req, res, next) => {
  try {
    const prescriptions = await prescriptionsService.listPrescriptions({
      user: req.user,
      authToken: req.headers.authorization,
      patientId: req.query.patientId,
      doctorId: req.query.doctorId,
    });

    return res.status(200).json({
      status: 'success',
      data: prescriptions,
    });
  } catch (error) {
    next(error);
  }
};
