import express from 'express';
import multer from 'multer';
import { query } from '../db.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.get('/', async (req, res) => {
  const { rows } = await query(`
    SELECT s.*, u.name AS university_name
    FROM students s
    LEFT JOIN universities u ON u.id = s.university_id
    ORDER BY s.created_at DESC
  `);
  res.json(rows);
});

router.get('/:id', async (req, res) => {
  const { rows } = await query(`
    SELECT s.*, u.name AS university_name
    FROM students s
    LEFT JOIN universities u ON u.id = s.university_id
    WHERE s.id = $1
  `, [req.params.id]);

  if (!rows.length) return res.status(404).json({ message: 'Student not found' });
  res.json(rows[0]);
});

router.post('/', async (req, res) => {
  const {
    university_id,
    student_name,
    father_name,
    mother_name,
    roll_no,
    enrollment_no,
    institution_name,
    course_name,
    semester,
    academic_session
  } = req.body;

  if (!student_name || !roll_no) {
    return res.status(400).json({ message: 'Student name and roll number are required' });
  }

  const id = uuidv4();

  const { rows } = await query(`
    INSERT INTO students (
      id, university_id, student_name, father_name, mother_name, roll_no,
      enrollment_no, institution_name, course_name, semester, academic_session
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING *
  `, [
    id,
    university_id || null,
    student_name,
    father_name || null,
    mother_name || null,
    roll_no,
    enrollment_no || null,
    institution_name || null,
    course_name || null,
    semester || null,
    academic_session || null
  ]);

  res.status(201).json(rows[0]);
});

router.post('/bulk-import', upload.single('csvFile'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'CSV file is required' });
  }

  const csv = req.file.buffer.toString('utf8');
  const lines = csv.trim().split(/\r?\n/);
  if (lines.length < 2) {
    return res.status(400).json({ message: 'CSV must contain header and data rows' });
  }

  const headers = lines[0].split(',').map((h) => h.trim().replace(/"/g, ''));
  const required = [
    'student_name',
    'roll_no',
    'father_name',
    'mother_name',
    'institution_name',
    'course_name',
    'semester',
    'academic_session'
  ];

  for (const field of required) {
    if (!headers.includes(field)) {
      return res.status(400).json({ message: `CSV missing required column: ${field}` });
    }
  }

  const insertRows = [];
  for (let i = 1; i < lines.length; i++) {
    const row = lines[i].split(',').map((v) => v.trim().replace(/"/g, ''));
    if (row.length < headers.length) continue;

    const record = Object.fromEntries(headers.map((header, idx) => [header, row[idx] || '']));
    insertRows.push(record);
  }

  let created = 0;
  for (const record of insertRows) {
    await query(`
      INSERT INTO students (
        university_id, student_name, father_name, mother_name, roll_no,
        enrollment_no, institution_name, course_name, semester, academic_session
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `, [
      null,
      record.student_name,
      record.father_name || null,
      record.mother_name || null,
      record.roll_no,
      record.enrollment_no || null,
      record.institution_name || null,
      record.course_name || null,
      record.semester || null,
      record.academic_session || null
    ]);

    created += 1;
  }

  res.json({
    message: 'Bulk import successful',
    created
  });
});

router.delete('/:id', async (req, res) => {
  await query('DELETE FROM students WHERE id = $1', [req.params.id]);
  res.json({ message: 'Student deleted' });
});

export default router;
