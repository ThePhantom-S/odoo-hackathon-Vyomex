import express from 'express';
import { query, run, get } from '../db.js';
import { authenticateToken, authorizeRoles } from '../server.js';

const router = express.Router();

// List all vehicles (All roles except Safety Officer)
router.get('/', authenticateToken, authorizeRoles('Fleet Manager', 'Dispatcher', 'Financial Analyst'), async (req, res) => {
  const { type, status, search } = req.query;
  let sql = 'SELECT * FROM vehicles WHERE 1=1';
  const params = [];

  if (type && type !== 'All') {
    sql += ' AND type = ?';
    params.push(type);
  }
  if (status && status !== 'All') {
    sql += ' AND status = ?';
    params.push(status);
  }
  if (search) {
    sql += ' AND (registration_number LIKE ? OR name_model LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  try {
    const vehicles = await query(sql, params);
    res.json(vehicles);
  } catch (err) {
    console.error('Error fetching vehicles:', err);
    res.status(500).json({ error: 'Failed to fetch vehicles' });
  }
});

// Get a single vehicle details
router.get('/:registration_number', authenticateToken, authorizeRoles('Fleet Manager', 'Dispatcher', 'Financial Analyst'), async (req, res) => {
  try {
    const vehicle = await get('SELECT * FROM vehicles WHERE registration_number = ?', [req.params.registration_number]);
    if (!vehicle) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }
    res.json(vehicle);
  } catch (err) {
    console.error('Error fetching vehicle:', err);
    res.status(500).json({ error: 'Failed to fetch vehicle' });
  }
});

// Create a new vehicle (Fleet Manager only)
router.post('/', authenticateToken, authorizeRoles('Fleet Manager'), async (req, res) => {
  const { registration_number, name_model, type, max_load_capacity, odometer, acquisition_cost, status } = req.body;

  // Validations
  if (!registration_number || !name_model || !type || !max_load_capacity || odometer === undefined || !acquisition_cost) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  const validTypes = ['Van', 'Truck', 'Mini', 'Sedan'];
  if (!validTypes.includes(type)) {
    return res.status(400).json({ error: 'Invalid vehicle type. Must be Van, Truck, Mini, or Sedan' });
  }

  const validStatuses = ['Available', 'On Trip', 'In Shop', 'Retired'];
  const vehicleStatus = status || 'Available';
  if (!validStatuses.includes(vehicleStatus)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  if (parseFloat(max_load_capacity) <= 0) {
    return res.status(400).json({ error: 'Max load capacity must be greater than 0' });
  }
  if (parseFloat(odometer) < 0) {
    return res.status(400).json({ error: 'Odometer cannot be negative' });
  }
  if (parseFloat(acquisition_cost) <= 0) {
    return res.status(400).json({ error: 'Acquisition cost must be greater than 0' });
  }

  const formattedRegNo = registration_number.trim().toUpperCase();

  try {
    // Check uniqueness
    const existing = await get('SELECT * FROM vehicles WHERE registration_number = ?', [formattedRegNo]);
    if (existing) {
      return res.status(400).json({ error: 'A vehicle with this registration number already exists' });
    }

    await run(
      `INSERT INTO vehicles (registration_number, name_model, type, max_load_capacity, odometer, acquisition_cost, status) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [formattedRegNo, name_model.trim(), type, parseFloat(max_load_capacity), parseFloat(odometer), parseFloat(acquisition_cost), vehicleStatus]
    );

    const newVehicle = await get('SELECT * FROM vehicles WHERE registration_number = ?', [formattedRegNo]);
    res.status(201).json(newVehicle);
  } catch (err) {
    console.error('Error creating vehicle:', err);
    res.status(500).json({ error: 'Failed to create vehicle' });
  }
});

// Update vehicle (Fleet Manager only)
router.put('/:registration_number', authenticateToken, authorizeRoles('Fleet Manager'), async (req, res) => {
  const { name_model, type, max_load_capacity, odometer, acquisition_cost, status } = req.body;
  const regNo = req.params.registration_number;

  // Validations
  if (!name_model || !type || !max_load_capacity || odometer === undefined || !acquisition_cost || !status) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  const validTypes = ['Van', 'Truck', 'Mini', 'Sedan'];
  if (!validTypes.includes(type)) {
    return res.status(400).json({ error: 'Invalid vehicle type' });
  }

  const validStatuses = ['Available', 'On Trip', 'In Shop', 'Retired'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  if (parseFloat(max_load_capacity) <= 0) {
    return res.status(400).json({ error: 'Max load capacity must be greater than 0' });
  }
  if (parseFloat(odometer) < 0) {
    return res.status(400).json({ error: 'Odometer cannot be negative' });
  }
  if (parseFloat(acquisition_cost) <= 0) {
    return res.status(400).json({ error: 'Acquisition cost must be greater than 0' });
  }

  try {
    const existing = await get('SELECT * FROM vehicles WHERE registration_number = ?', [regNo]);
    if (!existing) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }

    // Check if status is transitioning to Retired or In Shop while on active trip
    if ((status === 'Retired' || status === 'In Shop') && existing.status === 'On Trip') {
      // Check if there is an active (Dispatched) trip for this vehicle
      const activeTrip = await get("SELECT * FROM trips WHERE vehicle_reg_no = ? AND status = 'Dispatched'", [regNo]);
      if (activeTrip) {
        return res.status(400).json({ error: 'Cannot set vehicle to In Shop/Retired while it is dispatched on an active trip' });
      }
    }

    await run(
      `UPDATE vehicles SET name_model = ?, type = ?, max_load_capacity = ?, odometer = ?, acquisition_cost = ?, status = ?
       WHERE registration_number = ?`,
      [name_model.trim(), type, parseFloat(max_load_capacity), parseFloat(odometer), parseFloat(acquisition_cost), status, regNo]
    );

    const updatedVehicle = await get('SELECT * FROM vehicles WHERE registration_number = ?', [regNo]);
    res.json(updatedVehicle);
  } catch (err) {
    console.error('Error updating vehicle:', err);
    res.status(500).json({ error: 'Failed to update vehicle' });
  }
});

// Delete vehicle (Fleet Manager only)
router.delete('/:registration_number', authenticateToken, authorizeRoles('Fleet Manager'), async (req, res) => {
  const regNo = req.params.registration_number;

  try {
    const existing = await get('SELECT * FROM vehicles WHERE registration_number = ?', [regNo]);
    if (!existing) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }

    // Check if vehicle is on trip
    if (existing.status === 'On Trip') {
      return res.status(400).json({ error: 'Cannot delete a vehicle that is currently on a trip' });
    }

    await run('DELETE FROM vehicles WHERE registration_number = ?', [regNo]);
    res.json({ message: 'Vehicle deleted successfully' });
  } catch (err) {
    console.error('Error deleting vehicle:', err);
    if (err.message && err.message.includes('FOREIGN KEY constraint failed')) {
      return res.status(400).json({ error: 'Cannot delete vehicle as it has historical trip or maintenance records' });
    }
    res.status(500).json({ error: 'Failed to delete vehicle' });
  }
});

export default router;
