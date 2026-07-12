import express from 'express';
import { query, run, get } from '../db.js';
import { authenticateToken, authorizeRoles } from '../server.js';

const router = express.Router();

// List all maintenance logs (Fleet Manager, Financial Analyst)
router.get('/', authenticateToken, authorizeRoles('Fleet Manager', 'Financial Analyst'), async (req, res) => {
  let sql = `
    SELECT m.*, v.name_model as vehicle_name 
    FROM maintenance_logs m
    JOIN vehicles v ON m.vehicle_reg_no = v.registration_number
    ORDER BY m.created_at DESC
  `;
  try {
    const logs = await query(sql);
    res.json(logs);
  } catch (err) {
    console.error('Error fetching maintenance logs:', err);
    res.status(500).json({ error: 'Failed to fetch maintenance logs' });
  }
});

// Create Maintenance Log (Fleet Manager only)
router.post('/', authenticateToken, authorizeRoles('Fleet Manager'), async (req, res) => {
  const { vehicle_reg_no, service_type, cost, date, notes } = req.body;

  if (!vehicle_reg_no || !service_type || cost === undefined || !date) {
    return res.status(400).json({ error: 'Vehicle, service type, cost, and date are required' });
  }

  const maintCost = parseFloat(cost);
  if (isNaN(maintCost) || maintCost < 0) {
    return res.status(400).json({ error: 'Maintenance cost must be non-negative' });
  }

  try {
    // Check vehicle exists and status
    const vehicle = await get('SELECT * FROM vehicles WHERE registration_number = ?', [vehicle_reg_no]);
    if (!vehicle) {
      return res.status(400).json({ error: 'Vehicle does not exist' });
    }
    if (vehicle.status === 'On Trip') {
      return res.status(400).json({ error: 'Cannot put a vehicle in maintenance while it is dispatched on a trip' });
    }

    // Insert maintenance log (Active)
    const result = await run(
      `INSERT INTO maintenance_logs (vehicle_reg_no, service_type, cost, date, status, notes)
       VALUES (?, ?, ?, ?, 'Active', ?)`,
      [vehicle_reg_no, service_type.trim(), maintCost, date, notes ? notes.trim() : '']
    );

    // Automatically transition vehicle status to In Shop
    await run("UPDATE vehicles SET status = 'In Shop' WHERE registration_number = ?", [vehicle_reg_no]);

    // Automatically create a Maintenance Expense record
    await run(
      `INSERT INTO expenses (vehicle_reg_no, type, cost, date, description) 
       VALUES (?, 'Maintenance', ?, ?, ?)`,
      [vehicle_reg_no, maintCost, date, `Maintenance service: ${service_type}`]
    );

    const newLog = await get('SELECT * FROM maintenance_logs WHERE id = ?', [result.id]);
    res.status(201).json(newLog);
  } catch (err) {
    console.error('Error creating maintenance log:', err);
    res.status(500).json({ error: 'Failed to create maintenance log' });
  }
});

// Complete/Close Maintenance Log (Fleet Manager only)
router.post('/:id/complete', authenticateToken, authorizeRoles('Fleet Manager'), async (req, res) => {
  const logId = req.params.id;

  try {
    const log = await get('SELECT * FROM maintenance_logs WHERE id = ?', [logId]);
    if (!log) {
      return res.status(404).json({ error: 'Maintenance log not found' });
    }
    if (log.status === 'Completed') {
      return res.status(400).json({ error: 'Maintenance is already completed' });
    }

    // Update maintenance status
    await run("UPDATE maintenance_logs SET status = 'Completed' WHERE id = ?", [logId]);

    // Restore vehicle to Available (unless its status has been changed to Retired)
    const vehicle = await get('SELECT * FROM vehicles WHERE registration_number = ?', [log.vehicle_reg_no]);
    if (vehicle && vehicle.status !== 'Retired') {
      await run("UPDATE vehicles SET status = 'Available' WHERE registration_number = ?", [log.vehicle_reg_no]);
    }

    res.json({ message: 'Maintenance completed successfully', status: 'Completed' });
  } catch (err) {
    console.error('Error completing maintenance:', err);
    res.status(500).json({ error: 'Failed to complete maintenance' });
  }
});

export default router;
