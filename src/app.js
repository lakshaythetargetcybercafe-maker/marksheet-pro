import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import studentRoutes from './routes/students.js';
import dashboardRoutes from './routes/dashboard.js';
import marksheetRoutes from './routes/marksheet.js';

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.get('/api/health', (req, res) => {
  res.json({ ok: true, message: 'API is running' });
});

app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/marksheet', marksheetRoutes);

export default app;
