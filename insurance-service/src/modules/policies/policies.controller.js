import * as policiesService from './policies.service.js';

export const createPolicyHandler = async (req, res, next) => {
  try {
    const policy = await policiesService.createPolicy(req.body);
    res.status(201).json({ status: 'success', data: policy });
  } catch (err) {
    next(err);
  }
};

export const getPoliciesHandler = async (req, res, next) => {
  try {
    const authToken = req.headers.authorization;
    const policies = await policiesService.getPolicies({
      user: req.user,
      authToken,
    });
    res.status(200).json({ status: 'success', data: policies });
  } catch (err) {
    next(err);
  }
};

export const getPolicyByIdHandler = async (req, res, next) => {
  try {
    const authToken = req.headers.authorization;
    const policy = await policiesService.getPolicyById(req.params.id, {
      user: req.user,
      authToken,
    });
    res.status(200).json({ status: 'success', data: policy });
  } catch (err) {
    next(err);
  }
};

export const deletePolicyHandler = async (req, res, next) => {
  try {
    const result = await policiesService.deletePolicy(req.params.id);
    res.status(200).json({ status: 'success', data: result });
  } catch (err) {
    next(err);
  }
};
