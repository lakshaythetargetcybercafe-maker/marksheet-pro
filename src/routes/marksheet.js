import express from 'express';
import { query } from '../db.js';
import PDFDocument from 'pdfkit';

const router = express.Router();

function calculateGrade(total) {
  if (total >= 90) return { grade: 'A+', points: 10 };
  if (total >= 80) return { grade: 'A', points: 9 };
  if (total >= 70) return { grade: 'B+', points: 8 };
  if (total >= 60) return { grade: 'B', points: 7 };
  if (total >= 50) return { grade: 'C', points: 6 };
  if (total >= 40) return { grade: 'P', points: 5 };
  return { grade: 'F', points: 0 };
}

function generateMarksheetPdf(student, university, marks, summary, res) {
  const doc = new PDFDocument({ size: 'A4', margin: 40 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${student.student_name.replace(/\s+/g, '_')}_marksheet.pdf"`);

  doc.pipe(res);

  doc.fontSize(18).font('Helvetica-Bold').text((university.name || 'University Name').toUpperCase(), { align: 'center' });
  doc.moveDown(0.3);
  doc.fontSize(11).font('Helvetica-Bold').text('STATEMENT OF MARKS - EXAMINATION', { align: 'center' });
  doc.moveDown(0.5);
  doc.fontSize(10).text(`Course / Semester: ${student.course_name} / ${student.semester}`, { align: 'center' });
  doc.moveDown(1.2);

  const startY = 120;

  doc.fontSize(10).font('Helvetica-Bold').text('Candidate\'s Name:', 50, startY);
  doc.font('Helvetica').text(student.student_name || '', 200, startY);

  doc.font('Helvetica-Bold').text('Roll No.:', 410, startY);
  doc.font('Helvetica').text(student.roll_no || '', 475, startY);

  doc.font('Helvetica-Bold').text('Father\'s Name:', 50, startY + 25);
  doc.font('Helvetica').text(student.father_name || '', 200, startY + 25);

  doc.font('Helvetica-Bold').text('Enroll No.:', 410, startY + 25);
  doc.font('Helvetica').text(student.enrollment_no || '', 475, startY + 25);

  doc.font('Helvetica-Bold').text('Mother\'s Name:', 50, startY + 50);
  doc.font('Helvetica').text(student.mother_name || '', 200, startY + 50);

  doc.font('Helvetica-Bold').text('Institution\'s Name:', 50, startY + 75);
  doc.font('Helvetica').text(student.institution_name || '', 200, startY + 75);

  const tableTop = 220;
  doc.rect(40, tableTop, 520, 25).stroke();
  doc.font('Helvetica-Bold').fontSize(8);
  doc.text('COURSE TITLE', 45, tableTop + 8);
  doc.text('CODE', 170, tableTop + 8);
  doc.text('MAX', 220, tableTop + 8);
  doc.text('MIN', 255, tableTop + 8);
  doc.text('INT+EXT', 300, tableTop + 8);
  doc.text('TOTAL', 370, tableTop + 8);
  doc.text('CREDIT', 420, tableTop + 8);
  doc.text('GRADE', 470, tableTop + 8);

  let y = tableTop + 30;
  marks.forEach((mark) => {
    doc.rect(40, y, 520, 22).stroke();
    doc.font('Helvetica').fontSize(8);
    doc.text(mark.subject_name || '', 45, y + 7, { width: 110 });
    doc.text(mark.subject_code || '', 170, y + 7);
    doc.text(String(mark.max_marks || 100), 220, y + 7);
    doc.text(String(mark.min_marks || 40), 255, y + 7);
    doc.text(`${mark.internal_marks || 0} + ${mark.external_marks || 0}`, 300, y + 7);
    doc.text(String(mark.total_marks || 0), 370, y + 7);
    doc.text(String(mark.credit || 0), 420, y + 7);
    doc.text(String(mark.grade || 'F'), 470, y + 7);

    y += 22;
  });

  doc.font('Helvetica-Bold').fontSize(9);
  doc.text('SGPA', 50, y + 26);
  doc.font('Helvetica').text(String(summary.sgpa || '0.00'), 100, y + 26);

  doc.font('Helvetica-Bold').text('CGPA', 150, y + 26);
  doc.font('Helvetica').text(String(summary.cgpa || '0.00'), 200, y + 26);

  doc.font('Helvetica-Bold').text('Result', 415, y + 26);
  doc.font('Helvetica').text(summary.result || 'PASS', 470, y + 26);

  doc.fontSize(8).text('Note: This is computer generated marksheet.', 50, 760, { align: 'center' });

  doc.end();
}

router.post('/student/:studentId/generate', async (req, res) => {
  const { university_id } = req.body || {};
  const studentId = req.params.studentId;

  const studentRes = await query(`
    SELECT * FROM students WHERE id = $1
  `, [studentId]);

  if (!studentRes.rows.length) {
    return res.status(404).json({ message: 'Student not found' });
  }

  const student = studentRes.rows[0];
  const subjectsRes = await query(`
    SELECT s.*, sub.subject_code AS subject_code, sub.subject_name AS subject_name,
           sub.max_marks, sub.min_marks, sub.credit
    FROM student_marks s
    LEFT JOIN subjects sub ON sub.id = s.subject_id
    WHERE s.student_id = $1
  `, [studentId]);

  const marks = subjectsRes.rows;

  const totalCredit = marks.reduce((sum, item) => sum + Number(item.credit || 0), 0);
  let totalGradePoints = 0;

  const preparedMarks = marks.map((item) => {
    const total = Number(item.internal_marks || 0) + Number(item.external_marks || 0);
    const gradeInfo = calculateGrade(total);
    totalGradePoints += (gradeInfo.points * Number(item.credit || 0));

    return {
      ...item,
      total_marks: total,
      grade: gradeInfo.grade,
      grade_points: gradeInfo.points
    };
  });

  const sgpa = totalCredit > 0 ? (totalGradePoints / totalCredit).toFixed(2) : '0.00';

  const universityRes = await query(`
    SELECT * FROM universities WHERE id = $1
  `, [university_id || student.university_id]);

  const university = universityRes.rows[0] || { name: 'Ch Bramsingh Institute' };

  const result = totalCredit > 0 ? 'PASS' : 'PENDING';

  const { rows } = await query(`
    INSERT INTO marksheets (student_id, university_id, semester, academic_session, total_credit, total_grade_points, sgpa, result)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *
  `, [
    studentId,
    university_id || student.university_id,
    student.semester,
    student.academic_session,
    totalCredit,
    totalGradePoints,
    sgpa,
    result
  ]);

  res.json({
    student,
    university,
    marks: preparedMarks,
    summary: {
      total_credit: totalCredit,
      total_grade_points: totalGradePoints,
      sgpa,
      result
    },
    marksheet_id: rows[0].id
  });
});

router.get('/student/:studentId/view', async (req, res) => {
  const studentId = req.params.studentId;

  const studentRes = await query(`
    SELECT * FROM students WHERE id = $1
  `, [studentId]);

  if (!studentRes.rows.length) {
    return res.status(404).json({ message: 'Student not found' });
  }

  const student = studentRes.rows[0];
  const marksRes = await query(`
    SELECT s.*, sub.subject_code, sub.subject_name, sub.max_marks, sub.min_marks, sub.credit
    FROM student_marks s
    LEFT JOIN subjects sub ON sub.id = s.subject_id
    WHERE s.student_id = $1
  `, [studentId]);

  const universityRes = await query(`
    SELECT * FROM universities WHERE id = $1
  `, [student.university_id]);

  const university = universityRes.rows[0] || { name: 'Ch Bramsingh Institute' };

  res.json({
    student,
    university,
    marks: marksRes.rows
  });
});

router.get('/student/:studentId/pdf', async (req, res) => {
  const studentId = req.params.studentId;

  const studentRes = await query(`
    SELECT * FROM students WHERE id = $1
  `, [studentId]);

  if (!studentRes.rows.length) {
    return res.status(404).json({ message: 'Student not found' });
  }

  const student = studentRes.rows[0];
  const marksRes = await query(`
    SELECT s.*, sub.subject_code AS subject_code, sub.subject_name AS subject_name,
           sub.max_marks, sub.min_marks, sub.credit
    FROM student_marks s
    LEFT JOIN subjects sub ON sub.id = s.subject_id
    WHERE s.student_id = $1
  `, [studentId]);

  const marks = marksRes.rows.map((item) => {
    const total = Number(item.internal_marks || 0) + Number(item.external_marks || 0);
    const gradeInfo = calculateGrade(total);
    return {
      ...item,
      total_marks: total,
      grade: gradeInfo.grade
    };
  });

  const totalCredit = marks.reduce((sum, item) => sum + Number(item.credit || 0), 0);
  const totalGradePoints = marks.reduce((sum, item) => sum + (Number(item.grade_points || 0) * Number(item.credit || 0)), 0);
  const sgpa = totalCredit > 0 ? (totalGradePoints / totalCredit).toFixed(2) : '0.00';

  const universityRes = await query(`
    SELECT * FROM universities WHERE id = $1
  `, [student.university_id]);

  const university = universityRes.rows[0] || { name: 'Ch Bramsingh Institute' };

  generateMarksheetPdf(student, university, marks, {
    sgpa,
    cgpa: sgpa,
    result: 'PASS'
  }, res);
});

export default router;
