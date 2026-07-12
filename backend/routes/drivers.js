import express from 'express';
import { query, run, get } from '../db.js';
import { authenticateToken, authorizeRoles } from '../server.js';

const router = express.Router();

// List all drivers (Fleet Managers and Safety Officers)
router.get('/', authenticateToken, authorizeRoles('Fleet Manager', 'Safety Officer'), async (req, res) => {
  const { status, search } = req.query;
  let sql = 'SELECT * FROM drivers WHERE 1=1';
  const params = [];

  if (status && status !== 'All') {
    sql += ' AND status = ?';
    params.push(status);
  }
  if (search) {
    sql += ' AND (name LIKE ? OR license_number LIKE ? OR contact_number LIKE ?)';
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  try {
    const drivers = await query(sql, params);
    res.json(drivers);
  } catch (err) {
    console.error('Error fetching drivers:', err);
    res.status(500).json({ error: 'Failed to fetch drivers' });
  }
});

// Get single driver
router.get('/:id', authenticateToken, authorizeRoles('Fleet Manager', 'Safety Officer'), async (req, res) => {
  try {
    const driver = await get('SELECT * FROM drivers WHERE id = ?', [req.params.id]);
    if (!driver) {
      return res.status(404).json({ error: 'Driver not found' });
    }
    res.json(driver);
  } catch (err) {
    console.error('Error fetching driver:', err);
    res.status(500).json({ error: 'Failed to fetch driver' });
  }
});

// Create driver (Fleet Manager and Safety Officer)
router.post('/', authenticateToken, authorizeRoles('Fleet Manager', 'Safety Officer'), async (req, res) => {
  const { name, license_number, license_category, license_expiry_date, contact_number, safety_score, status } = req.body;

  if (!name || !license_number || !license_category || !license_expiry_date || !contact_number) {
    return res.status(400).json({ error: 'All core fields are required' });
  }

  const score = safety_score !== undefined ? parseFloat(safety_score) : 100.0;
  if (isNaN(score) || score < 0 || score > 100) {
    return res.status(400).json({ error: 'Safety score must be between 0 and 100' });
  }

  const validStatuses = ['Available', 'On Trip', 'Off Duty', 'Suspended'];
  const driverStatus = status || 'Available';
  if (!validStatuses.includes(driverStatus)) {
    return res.status(400).json({ error: 'Invalid driver status' });
  }

  // Regex check for basic license expiry date YYYY-MM-DD
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(license_expiry_date)) {
    return res.status(400).json({ error: 'License expiry date must be in YYYY-MM-DD format' });
  }

  try {
    // Check unique license number
    const existing = await get('SELECT * FROM drivers WHERE license_number = ?', [license_number.trim()]);
    if (existing) {
      return res.status(400).json({ error: 'A driver with this license number already exists' });
    }

    const result = await run(
      `INSERT INTO drivers (name, license_number, license_category, license_expiry_date, contact_number, safety_score, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [name.trim(), license_number.trim(), license_category.trim(), license_expiry_date, contact_number.trim(), score, driverStatus]
    );

    const newDriver = await get('SELECT * FROM drivers WHERE id = ?', [result.id]);
    res.status(201).json(newDriver);
  } catch (err) {
    console.error('Error creating driver:', err);
    res.status(500).json({ error: 'Failed to create driver' });
  }
});

// Update driver (Fleet Manager and Safety Officer)
router.put('/:id', authenticateToken, authorizeRoles('Fleet Manager', 'Safety Officer'), async (req, res) => {
  const { name, license_number, license_category, license_expiry_date, contact_number, safety_score, status } = req.body;
  const driverId = req.params.id;

  if (!name || !license_number || !license_category || !license_expiry_date || !contact_number || !status) {
    return res.status(400).json({ error: 'All core fields are required' });
  }

  const score = safety_score !== undefined ? parseFloat(safety_score) : 100.0;
  if (isNaN(score) || score < 0 || score > 100) {
    return res.status(400).json({ error: 'Safety score must be between 0 and 100' });
  }

  const validStatuses = ['Available', 'On Trip', 'Off Duty', 'Suspended'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid driver status' });
  }

  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(license_expiry_date)) {
    return res.status(400).json({ error: 'License expiry date must be in YYYY-MM-DD format' });
  }

  try {
    const existing = await get('SELECT * FROM drivers WHERE id = ?', [driverId]);
    if (!existing) {
      return res.status(404).json({ error: 'Driver not found' });
    }

    // Check unique license number if it is changing
    if (license_number.trim() !== existing.license_number) {
      const duplicate = await get('SELECT * FROM drivers WHERE license_number = ?', [license_number.trim()]);
      if (duplicate) {
        return res.status(400).json({ error: 'A driver with this license number already exists' });
      }
    }

    // Check if status is transitioning to Suspended or Off Duty while on active trip
    if ((status === 'Suspended' || status === 'Off Duty') && existing.status === 'On Trip') {
      const activeTrip = await get("SELECT * FROM trips WHERE driver_id = ? AND status = 'Dispatched'", [driverId]);
      if (activeTrip) {
        return res.status(400).json({ error: 'Cannot set driver status to Off Duty/Suspended while active on a dispatched trip' });
      }
    }

    await run(
      `UPDATE drivers SET name = ?, license_number = ?, license_category = ?, license_expiry_date = ?, contact_number = ?, safety_score = ?, status = ?
       WHERE id = ?`,
      [name.trim(), license_number.trim(), license_category.trim(), license_expiry_date, contact_number.trim(), score, status, driverId]
    );

    const updatedDriver = await get('SELECT * FROM drivers WHERE id = ?', [driverId]);
    res.json(updatedDriver);
  } catch (err) {
    console.error('Error updating driver:', err);
    res.status(500).json({ error: 'Failed to update driver' });
  }
});

// Delete driver (Fleet Manager and Safety Officer)
router.delete('/:id', authenticateToken, authorizeRoles('Fleet Manager', 'Safety Officer'), async (req, res) => {
  const driverId = req.params.id;

  try {
    const existing = await get('SELECT * FROM drivers WHERE id = ?', [driverId]);
    if (!existing) {
      return res.status(404).json({ error: 'Driver not found' });
    }

    if (existing.status === 'On Trip') {
      return res.status(400).json({ error: 'Cannot delete driver currently on a active trip' });
    }

    await run('DELETE FROM drivers WHERE id = ?', [driverId]);
    res.json({ message: 'Driver deleted successfully' });
  } catch (err) {
    console.error('Error deleting driver:', err);
    if (err.message && err.message.includes('FOREIGN KEY constraint failed')) {
      return res.status(400).json({ error: 'Cannot delete driver as they have historical trip records' });
    }
    res.status(500).json({ error: 'Failed to delete driver' });
  }
});

export default router;
