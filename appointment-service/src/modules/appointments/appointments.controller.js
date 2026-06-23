import * as appointmentsService from './appointments.service.js';

export const createAppointment = async (req, res, next) => {
  try {
    const token = req.headers.authorization;
    const appt = await appointmentsService.scheduleAppointment(req.user, token, req.body);
    res.status(201).json({
      status: 'success',
      message: 'Appointment booked successfully',
      data: appt,
    });
  } catch (error) {
    next(error);
  }
};

export const getAppointments = async (req, res, next) => {
  try {
    const token = req.headers.authorization;
    const appointments = await appointmentsService.listAppointments(req.user, token);
    res.status(200).json({
      status: 'success',
      data: appointments,
    });
  } catch (error) {
    next(error);
  }
};

export const getAppointmentById = async (req, res, next) => {
  try {
    const token = req.headers.authorization;
    const appt = await appointmentsService.getAppointmentDetails(req.user, token, req.params.id);
    res.status(200).json({
      status: 'success',
      data: appt,
    });
  } catch (error) {
    next(error);
  }
};

export const updateAppointmentStatus = async (req, res, next) => {
  try {
    const token = req.headers.authorization;
    const appt = await appointmentsService.changeAppointmentStatus(
      req.user,
      token,
      req.params.id,
      req.body.status
    );
    res.status(200).json({
      status: 'success',
      message: `Appointment status successfully changed to ${req.body.status}`,
      data: appt,
    });
  } catch (error) {
    next(error);
  }
};
