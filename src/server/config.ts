import 'dotenv/config';

export const JWT_SECRET = process.env.JWT_SECRET || 'sims-secret-key';
export const NODE_ENV = process.env.NODE_ENV || 'development';
export const IS_PROD = NODE_ENV === 'production';
export const PORT = parseInt(process.env.PORT || '3009', 10);
