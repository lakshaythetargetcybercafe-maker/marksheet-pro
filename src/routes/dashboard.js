import express from 'express';
import { query } from '../db.js';

const router = express.Router();

router.get('/stats', async (req, res) => {
  const statsQuery = `
    SELECT
      (SELECT COUNT(*) FROM students) AS total_students,
      (SELECT COUNT(*) FROM users) AS total_admins,
      (SELECT COUNT(*) FROM universities) AS total_universities,
      (SELECT COUNT(*) FROM marksheets) AS total_marksheets
  `;

  const { rows } = await query(statsQuery);
  res.json(rows[0]);
});

export default router;
