import * as patientsService from './patients.service.js';

export const createPatientProfile = async (req, res, next) => {
  try {
    const profile = await patientsService.createProfile(req.user, req.body);
    res.status(201).json({
      status: 'success',
      message: 'Patient profile created successfully',
      data: profile,
    });
  } catch (error) {
    next(error);
  }
};

export const getPatientById = async (req, res, next) => {
  try {
    const patient = await patientsService.getProfileById(req.user, req.params.id);
    res.status(200).json({
      status: 'success',
      data: patient,
    });
  } catch (error) {
    next(error);
  }
};

export const updatePatientProfile = async (req, res, next) => {
  try {
    const profile = await patientsService.updateProfile(req.user, req.params.id, req.body);
    res.status(200).json({
      status: 'success',
      message: 'Patient profile updated successfully',
      data: profile,
    });
  } catch (error) {
    next(error);
  }
};

// Internal service-to-service endpoint — returns just the patient's email by profile ID
export const getPatientEmail = async (req, res, next) => {
  try {
    const patient = await patientsService.getProfileById(
      { role: 'admin', id: null }, // bypass access-control for internal lookup
      req.params.id
    );
    res.status(200).json({
      status: 'success',
      data: { email: patient.email || null },
    });
  } catch (error) {
    next(error);
  }
};
