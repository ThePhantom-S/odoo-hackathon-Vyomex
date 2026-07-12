import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { initDb, get } from './db.js';
import vehicleRouter from './routes/vehicles.js';
import driverRouter from './routes/drivers.js';
import tripRouter from './routes/trips.js';
import maintenanceRouter from './routes/maintenance.js';
import expenseRouter from './routes/expenses.js';
import reportRouter from './routes/reports.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'transitops_super_secret_key_123';

app.use(cors());
app.use(express.json());

// Initialize Database on Startup
try {
  await initDb();
  console.log('Database initialized successfully.');
} catch (err) {
  console.error('Database initialization failed:', err);
}

// Authentication Middleware
export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Role authorization middleware
export const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied: insufficient permissions' });
    }
    next();
  };
};

// --- AUTHENTICATION ROUTES ---

// Login Endpoint
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const user = await get('SELECT * FROM users WHERE email = ?', [email]);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isPasswordValid = bcrypt.compareSync(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Generate token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Profile validation endpoint
app.get('/api/auth/me', authenticateToken, (req, res) => {
  res.json({ user: req.user });
});

// Mount Resource Routes
app.use('/api/vehicles', vehicleRouter);
app.use('/api/drivers', driverRouter);
app.use('/api/trips', tripRouter);
app.use('/api/maintenance', maintenanceRouter);
app.use('/api/expenses', expenseRouter);
app.use('/api/reports', reportRouter);

// Base Route
app.get('/', (req, res) => {
  res.send('TransitOps API is running.');
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

export default app;
