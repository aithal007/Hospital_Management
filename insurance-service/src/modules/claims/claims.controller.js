import * as claimsService from './claims.service.js';

export const submitClaimHandler = async (req, res, next) => {
  try {
    const authToken = req.headers.authorization;
    const { appointment_id, amount } = req.body;
    const claim = await claimsService.submitClaim({
      user: req.user,
      authToken,
      appointment_id,
      amount,
    });
    res.status(201).json({ status: 'success', data: claim });
  } catch (err) {
    next(err);
  }
};

export const getClaimByIdHandler = async (req, res, next) => {
  try {
    const authToken = req.headers.authorization;
    const claim = await claimsService.getClaimById(req.params.id, {
      user: req.user,
      authToken,
    });
    res.status(200).json({ status: 'success', data: claim });
  } catch (err) {
    next(err);
  }
};

export const getClaimsHandler = async (req, res, next) => {
  try {
    const authToken = req.headers.authorization;
    const { patientId } = req.query;
    const claims = await claimsService.getClaims({
      user: req.user,
      authToken,
      patientId,
    });
    res.status(200).json({ status: 'success', data: claims });
  } catch (err) {
    next(err);
  }
};
