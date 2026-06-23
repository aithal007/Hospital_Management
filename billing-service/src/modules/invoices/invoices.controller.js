import * as invoicesService from './invoices.service.js';

export const createInvoiceHandler = async (req, res, next) => {
  const token = req.headers.authorization; // Retrieve the bearer token from the client request header
  const { appointment_id, amount } = req.body;

  try {
    const invoice = await invoicesService.createInvoice({
      appointmentId: appointment_id,
      amount: parseFloat(amount),
      token,
    });

    return res.status(201).json({
      status: 'success',
      message: 'Invoice created successfully',
      data: invoice,
    });
  } catch (error) {
    next(error);
  }
};

export const getInvoicesHandler = async (req, res, next) => {
  try {
    const invoices = await invoicesService.getInvoices({
      user: req.user,
      authToken: req.headers.authorization,
    });
    return res.status(200).json({
      status: 'success',
      data: invoices,
    });
  } catch (error) {
    next(error);
  }
};

export const getInvoiceByIdHandler = async (req, res, next) => {
  try {
    const invoice = await invoicesService.getInvoiceById(req.params.id, {
      user: req.user,
      authToken: req.headers.authorization,
    });
    return res.status(200).json({
      status: 'success',
      data: invoice,
    });
  } catch (error) {
    next(error);
  }
};

export const payInvoiceHandler = async (req, res, next) => {
  const { method, amount } = req.body;
  const { id } = req.params;

  try {
    const result = await invoicesService.processInvoicePayment(id, {
      method,
      amount: parseFloat(amount),
      user: req.user,
      authToken: req.headers.authorization,
    });

    return res.status(200).json({
      status: 'success',
      message: 'Payment recorded successfully and invoice status updated',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const refundInvoiceHandler = async (req, res, next) => {
  const { id } = req.params;

  try {
    const result = await invoicesService.processInvoiceRefund(id, {
      user: req.user,
    });

    return res.status(200).json({
      status: 'success',
      message: 'Invoice refunded successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

