import dotenv from 'dotenv';
dotenv.config();

export default {
  port: Number(process.env.PORT || 3000),
  jwtSecret: process.env.JWT_SECRET || 'devsecret',
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 5432),
    database: process.env.DB_NAME || 'marksheet_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres'
  }
};
