import * as doctorsService from './doctors.service.js';

export const createDoctorProfile = async (req, res, next) => {
  try {
    const profile = await doctorsService.createProfile(req.user, req.body);
    res.status(201).json({
      status: 'success',
      message: 'Doctor profile created successfully',
      data: profile,
    });
  } catch (error) {
    next(error);
  }
};

export const getDoctorById = async (req, res, next) => {
  try {
    const doctor = await doctorsService.getProfileById(req.params.id);
    res.status(200).json({
      status: 'success',
      data: doctor,
    });
  } catch (error) {
    next(error);
  }
};

export const getDoctors = async (req, res, next) => {
  try {
    const page = req.query.page || 1;
    const limit = req.query.limit || 10;
    const specialization = req.query.specialization;

    const result = await doctorsService.listDoctors({ specialization, page, limit });
    res.status(200).json({
      status: 'success',
      results: result.results,
      pagination: result.pagination,
      data: result.data,
    });
  } catch (error) {
    next(error);
  }
};

export const updateDoctorProfile = async (req, res, next) => {
  try {
    const profile = await doctorsService.updateProfile(req.user, req.params.id, req.body);
    res.status(200).json({
      status: 'success',
      message: 'Doctor profile updated successfully',
      data: profile,
    });
  } catch (error) {
    next(error);
  }
};

export const getPopular = async (req, res, next) => {
  try {
    const popular = await doctorsService.getPopularDoctors();
    res.status(200).json({
      status: 'success',
      data: popular,
    });
  } catch (error) {
    next(error);
  }
};
