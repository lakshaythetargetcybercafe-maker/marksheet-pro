CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(100) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name VARCHAR(200) NOT NULL,
  role VARCHAR(50) DEFAULT 'admin',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE universities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  short_name VARCHAR(100),
  logo_url TEXT,
  address TEXT,
  phone VARCHAR(50),
  email VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  university_id UUID REFERENCES universities(id) ON DELETE CASCADE,
  student_name VARCHAR(200) NOT NULL,
  father_name VARCHAR(200),
  mother_name VARCHAR(200),
  roll_no VARCHAR(100) NOT NULL,
  enrollment_no VARCHAR(100),
  institution_name VARCHAR(200),
  course_name VARCHAR(200),
  semester VARCHAR(50),
  academic_session VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  university_id UUID REFERENCES universities(id) ON DELETE CASCADE,
  subject_code VARCHAR(50) NOT NULL,
  subject_name VARCHAR(200) NOT NULL,
  max_marks INTEGER NOT NULL DEFAULT 100,
  min_marks INTEGER NOT NULL DEFAULT 40,
  credit INTEGER NOT NULL DEFAULT 6,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE student_marks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
  internal_marks INTEGER DEFAULT 0,
  external_marks INTEGER DEFAULT 0,
  total_marks INTEGER DEFAULT 0,
  grade VARCHAR(10),
  grade_points NUMERIC(4,2),
  remarks TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(student_id, subject_id)
);

CREATE TABLE marksheets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  university_id UUID REFERENCES universities(id) ON DELETE CASCADE,
  semester VARCHAR(50),
  academic_session VARCHAR(100),
  total_credit INTEGER DEFAULT 0,
  total_grade_points NUMERIC(6,2) DEFAULT 0,
  sgpa NUMERIC(5,2) DEFAULT 0,
  cgpa NUMERIC(5,2) DEFAULT 0,
  result VARCHAR(20) DEFAULT 'PASS',
  created_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO universities (id, name, short_name, address)
VALUES (
  gen_random_uuid(),
  'Ch Bramsingh Institute',
  'CBI',
  'Meerut, Uttar Pradesh'
);

INSERT INTO users (username, password_hash, full_name, role)
VALUES (
  'admin',
  '$2a$10$F2aFQ5LqMQYtJRv2vK8V9elHfDkvQvC1NysxXr2Ri2A4g2vJgS7mK',
  'Admin User',
  'admin'
);

CREATE INDEX idx_students_roll_no ON students(roll_no);
CREATE INDEX idx_students_university_id ON students(university_id);
CREATE INDEX idx_student_marks_student_id ON student_marks(student_id);
CREATE INDEX idx_marksheets_student_id ON marksheets(student_id);
