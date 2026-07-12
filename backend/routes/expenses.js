import express from 'express';
import { query, run, get } from '../db.js';
import { authenticateToken, authorizeRoles } from '../server.js';

const router = express.Router();

// List all expenses (Fleet Manager, Financial Analyst)
router.get('/', authenticateToken, authorizeRoles('Fleet Manager', 'Financial Analyst'), async (req, res) => {
  let sql = `
    SELECT e.*, v.name_model as vehicle_name 
    FROM expenses e
    JOIN vehicles v ON e.vehicle_reg_no = v.registration_number
    ORDER BY e.date DESC, e.created_at DESC
  `;
  try {
    const expenses = await query(sql);
    res.json(expenses);
  } catch (err) {
    console.error('Error fetching expenses:', err);
    res.status(500).json({ error: 'Failed to fetch expenses' });
  }
});

// Record a new manual expense (Financial Analyst only)
router.post('/', authenticateToken, authorizeRoles('Financial Analyst'), async (req, res) => {
  const { vehicle_reg_no, trip_id, type, cost, date, description } = req.body;

  if (!vehicle_reg_no || !type || cost === undefined || !date) {
    return res.status(400).json({ error: 'Vehicle, expense type, cost, and date are required' });
  }

  const expCost = parseFloat(cost);
  if (isNaN(expCost) || expCost <= 0) {
    return res.status(400).json({ error: 'Expense cost must be greater than 0' });
  }

  const validTypes = ['Toll', 'Fuel', 'Maintenance', 'Other'];
  if (!validTypes.includes(type)) {
    return res.status(400).json({ error: 'Invalid expense type. Must be Toll, Fuel, Maintenance, or Other' });
  }

  try {
    // Check vehicle exists
    const vehicle = await get('SELECT * FROM vehicles WHERE registration_number = ?', [vehicle_reg_no]);
    if (!vehicle) {
      return res.status(400).json({ error: 'Vehicle does not exist' });
    }

    // Check trip exists if provided
    if (trip_id) {
      const trip = await get('SELECT * FROM trips WHERE id = ?', [trip_id]);
      if (!trip) {
        return res.status(400).json({ error: 'Trip does not exist' });
      }
    }

    const result = await run(
      `INSERT INTO expenses (vehicle_reg_no, trip_id, type, cost, date, description)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [vehicle_reg_no, trip_id || null, type, expCost, date, description ? description.trim() : '']
    );

    const newExpense = await get('SELECT * FROM expenses WHERE id = ?', [result.id]);
    res.status(201).json(newExpense);
  } catch (err) {
    console.error('Error creating expense:', err);
    res.status(500).json({ error: 'Failed to create expense' });
  }
});

// List all Fuel Logs (Fleet Manager, Financial Analyst)
router.get('/fuel-logs', authenticateToken, authorizeRoles('Fleet Manager', 'Financial Analyst'), async (req, res) => {
  let sql = `
    SELECT f.*, v.name_model as vehicle_name 
    FROM fuel_logs f
    JOIN vehicles v ON f.vehicle_reg_no = v.registration_number
    ORDER BY f.date DESC, f.created_at DESC
  `;
  try {
    const fuelLogs = await query(sql);
    res.json(fuelLogs);
  } catch (err) {
    console.error('Error fetching fuel logs:', err);
    res.status(500).json({ error: 'Failed to fetch fuel logs' });
  }
});

// Record a Fuel Log manually (Financial Analyst only)
router.post('/fuel-logs', authenticateToken, authorizeRoles('Financial Analyst'), async (req, res) => {
  const { vehicle_reg_no, liters, cost, date } = req.body;

  if (!vehicle_reg_no || liters === undefined || cost === undefined || !date) {
    return res.status(400).json({ error: 'Vehicle, liters, cost, and date are required' });
  }

  const fuelLiters = parseFloat(liters);
  const fuelCost = parseFloat(cost);

  if (isNaN(fuelLiters) || fuelLiters <= 0) {
    return res.status(400).json({ error: 'Liters must be greater than 0' });
  }
  if (isNaN(fuelCost) || fuelCost <= 0) {
    return res.status(400).json({ error: 'Cost must be greater than 0' });
  }

  try {
    // Check vehicle exists
    const vehicle = await get('SELECT * FROM vehicles WHERE registration_number = ?', [vehicle_reg_no]);
    if (!vehicle) {
      return res.status(400).json({ error: 'Vehicle does not exist' });
    }

    // Insert Fuel Log
    const result = await run(
      `INSERT INTO fuel_logs (vehicle_reg_no, liters, cost, date)
       VALUES (?, ?, ?, ?)`,
      [vehicle_reg_no, fuelLiters, fuelCost, date]
    );

    // Also insert an Expense entry of type 'Fuel'
    await run(
      `INSERT INTO expenses (vehicle_reg_no, type, cost, date, description) 
       VALUES (?, 'Fuel', ?, ?, ?)`,
      [vehicle_reg_no, fuelCost, date, `Manual Fuel Log: ${fuelLiters}L`]
    );

    const newLog = await get('SELECT * FROM fuel_logs WHERE id = ?', [result.id]);
    res.status(201).json(newLog);
  } catch (err) {
    console.error('Error creating fuel log:', err);
    res.status(500).json({ error: 'Failed to create fuel log' });
  }
});

// Aggregate operational cost per vehicle (Fleet Manager, Financial Analyst)
router.get('/vehicle-summary', authenticateToken, authorizeRoles('Fleet Manager', 'Financial Analyst'), async (req, res) => {
  try {
    const summary = await query(`
      SELECT 
        v.registration_number,
        v.name_model,
        v.type,
        v.acquisition_cost,
        COALESCE(SUM(CASE WHEN e.type = 'Fuel' THEN e.cost ELSE 0 END), 0) as total_fuel_cost,
        COALESCE(SUM(CASE WHEN e.type = 'Maintenance' THEN e.cost ELSE 0 END), 0) as total_maintenance_cost,
        COALESCE(SUM(CASE WHEN e.type = 'Toll' THEN e.cost ELSE 0 END), 0) as total_toll_cost,
        COALESCE(SUM(CASE WHEN e.type = 'Other' THEN e.cost ELSE 0 END), 0) as total_other_cost,
        COALESCE(SUM(e.cost), 0) as total_operational_cost
      FROM vehicles v
      LEFT JOIN expenses e ON v.registration_number = e.vehicle_reg_no
      GROUP BY v.registration_number
    `);
    res.json(summary);
  } catch (err) {
    console.error('Error calculating vehicle summary:', err);
    res.status(500).json({ error: 'Failed to fetch vehicle cost summary' });
  }
});

export default router;
