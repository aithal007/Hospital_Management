import { query } from '../db/index.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config/index.js';

export const register = async (req, res, next) => {
  const { email, password, role, first_name, last_name, phone } = req.body;

  try {
    // 1. Check if email is already taken
    const existingUser = await query('SELECT id FROM users WHERE email = $1;', [email]);
    if (existingUser.rows.length > 0) {
      const error = new Error('Email is already registered');
      error.statusCode = 400;
      throw error;
    }

    // 2. Hash the user password safely (10 rounds)
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // 3. Insert new user record with hashed password
    const result = await query(
      `INSERT INTO users (email, password_hash, role, first_name, last_name, phone)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, email, role, first_name, last_name, phone, created_at;`,
      [email, hashedPassword, role, first_name, last_name, phone]
    );

    // 4. Return created user details (omitting the password string for security)
    res.status(201).json({
      status: 'success',
      message: 'User registered successfully',
      data: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  const { email, password } = req.body;

  try {
    // 1. Fetch user by email
    const result = await query(
      'SELECT id, email, password_hash, role FROM users WHERE email = $1;',
      [email]
    );

    if (result.rows.length === 0) {
      const error = new Error('Invalid email or password');
      error.statusCode = 401;
      throw error;
    }

    const user = result.rows[0];

    // 2. Verify hashed password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      const error = new Error('Invalid email or password');
      error.statusCode = 401;
      throw error;
    }

    // 3. Sign JWT token containing identity details (valid for 24h)
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // 4. Send token back to the client
    res.status(200).json({
      status: 'success',
      message: 'Login successful',
      token
    });
  } catch (error) {
    next(error);
  }
};

