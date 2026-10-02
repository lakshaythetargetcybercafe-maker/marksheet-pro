import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../db.js';
import config from '../config.js';

const router = express.Router();

router.post('/login', async (req, res) => {
  const { username, password } = req.body || {};

  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password required' });
  }

  const { rows } = await query('SELECT * FROM users WHERE username = $1', [username]);

  if (!rows.length) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const user = rows[0];
  const valid = await bcrypt.compare(password, user.password_hash);

  if (!valid) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const token = jwt.sign(
    { userId: user.id, username: user.username, role: user.role },
    config.jwtSecret,
    { expiresIn: '8h' }
  );

  res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      full_name: user.full_name,
      role: user.role
    }
  });
});

router.post('/register', async (req, res) => {
  const { username, password, full_name } = req.body || {};

  if (!username || !password || !full_name) {
    return res.status(400).json({ message: 'All fields required' });
  }

  const hash = await bcrypt.hash(password, 10);

  const { rows } = await query(
    `INSERT INTO users (username, password_hash, full_name)
     VALUES ($1, $2, $3) RETURNING id, username, full_name, role`,
    [username, hash, full_name]
  );

  res.status(201).json({ user: rows[0] });
});

export default router;
