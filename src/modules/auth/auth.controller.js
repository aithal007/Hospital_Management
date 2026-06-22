import * as authService from './auth.service.js';

export const register = async (req, res, next) => {
  try {
    const user = await authService.registerUser(req.body);
    res.status(201).json({
      status: 'success',
      message: 'User registered successfully',
      data: user
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const token = await authService.loginUser(req.body);
    res.status(200).json({
      status: 'success',
      message: 'Login successful',
      token
    });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req, res, next) => {
  try {
    const user = await authService.getUserDetails(req.user.id);
    res.status(200).json({
      status: 'success',
      data: user
    });
  } catch (error) {
    next(error);
  }
};
