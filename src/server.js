import app from './app.js';
import config from './config.js';
import { pool } from './db.js';

async function start() {
  try {
    await pool.query('SELECT 1');
    console.log('Database connected successfully');
    app.listen(config.port, () => {
      console.log(`Server running at http://localhost:${config.port}`);
    });
  } catch (error) {
    console.error('Database connection failed:', error.message);
    process.exit(1);
  }
}

start();
