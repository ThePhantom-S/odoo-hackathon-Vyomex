import express from 'express';
import { query, run, get } from '../db.js';
import { authenticateToken, authorizeRoles } from '../server.js';

const router = express.Router();

// List all trips (All roles)
router.get('/', authenticateToken, async (req, res) => {
  const { status } = req.query;
  let sql = `
    SELECT t.*, v.name_model as vehicle_name, d.name as driver_name 
    FROM trips t
    JOIN vehicles v ON t.vehicle_reg_no = v.registration_number
    JOIN drivers d ON t.driver_id = d.id
    WHERE 1=1
  `;
  const params = [];

  if (status && status !== 'All') {
    sql += ' AND t.status = ?';
    params.push(status);
  }
  
  sql += ' ORDER BY t.created_at DESC';

  try {
    const trips = await query(sql, params);
    res.json(trips);
  } catch (err) {
    console.error('Error fetching trips:', err);
    res.status(500).json({ error: 'Failed to fetch trips' });
  }
});

// Get single trip
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const trip = await get(`
      SELECT t.*, v.name_model as vehicle_name, d.name as driver_name 
      FROM trips t
      JOIN vehicles v ON t.vehicle_reg_no = v.registration_number
      JOIN drivers d ON t.driver_id = d.id
      WHERE t.id = ?
    `, [req.params.id]);

    if (!trip) {
      return res.status(404).json({ error: 'Trip not found' });
    }
    res.json(trip);
  } catch (err) {
    console.error('Error fetching trip:', err);
    res.status(500).json({ error: 'Failed to fetch trip' });
  }
});

// Create new trip (Dispatcher only)
router.post('/', authenticateToken, authorizeRoles('Dispatcher'), async (req, res) => {
  const { source, destination, vehicle_reg_no, driver_id, cargo_weight, planned_distance, revenue } = req.body;

  if (!source || !destination || !vehicle_reg_no || !driver_id || !cargo_weight || !planned_distance) {
    return res.status(400).json({ error: 'All fields except revenue are required' });
  }

  const weight = parseFloat(cargo_weight);
  const distance = parseFloat(planned_distance);
  const rev = revenue ? parseFloat(revenue) : 0.0;

  if (isNaN(weight) || weight <= 0) {
    return res.status(400).json({ error: 'Cargo weight must be greater than 0' });
  }
  if (isNaN(distance) || distance <= 0) {
    return res.status(400).json({ error: 'Planned distance must be greater than 0' });
  }

  try {
    // 1. Validate Vehicle
    const vehicle = await get('SELECT * FROM vehicles WHERE registration_number = ?', [vehicle_reg_no]);
    if (!vehicle) {
      return res.status(400).json({ error: 'Vehicle does not exist' });
    }
    if (vehicle.status === 'Retired' || vehicle.status === 'In Shop') {
      return res.status(400).json({ error: `Vehicle is currently ${vehicle.status} and cannot be dispatched` });
    }
    if (weight > vehicle.max_load_capacity) {
      return res.status(400).json({ 
        error: `Cargo weight (${weight} kg) exceeds vehicle maximum capacity (${vehicle.max_load_capacity} kg)` 
      });
    }

    // 2. Validate Driver
    const driver = await get('SELECT * FROM drivers WHERE id = ?', [driver_id]);
    if (!driver) {
      return res.status(400).json({ error: 'Driver does not exist' });
    }
    if (driver.status === 'Suspended') {
      return res.status(400).json({ error: 'Driver is currently suspended and cannot be assigned to trips' });
    }
    
    // License expiry validation
    const todayStr = new Date().toISOString().split('T')[0];
    if (driver.license_expiry_date < todayStr) {
      return res.status(400).json({ error: `Driver license has expired on ${driver.license_expiry_date}` });
    }

    // Create Draft Trip
    const result = await run(
      `INSERT INTO trips (source, destination, vehicle_reg_no, driver_id, cargo_weight, planned_distance, revenue, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'Draft')`,
      [source.trim(), destination.trim(), vehicle_reg_no, parseInt(driver_id), weight, distance, rev]
    );

    const newTrip = await get('SELECT * FROM trips WHERE id = ?', [result.id]);
    res.status(201).json(newTrip);
  } catch (err) {
    console.error('Error creating trip:', err);
    res.status(500).json({ error: 'Failed to create trip' });
  }
});

// Dispatch Trip (Dispatcher only)
router.post('/:id/dispatch', authenticateToken, authorizeRoles('Dispatcher'), async (req, res) => {
  const tripId = req.params.id;

  try {
    const trip = await get('SELECT * FROM trips WHERE id = ?', [tripId]);
    if (!trip) {
      return res.status(404).json({ error: 'Trip not found' });
    }
    if (trip.status !== 'Draft') {
      return res.status(400).json({ error: `Cannot dispatch a trip that is in ${trip.status} status` });
    }

    // Check availability of vehicle and driver
    const vehicle = await get('SELECT * FROM vehicles WHERE registration_number = ?', [trip.vehicle_reg_no]);
    const driver = await get('SELECT * FROM drivers WHERE id = ?', [trip.driver_id]);

    if (vehicle.status === 'On Trip') {
      return res.status(400).json({ error: 'Vehicle is already dispatched on another trip' });
    }
    if (vehicle.status === 'In Shop' || vehicle.status === 'Retired') {
      return res.status(400).json({ error: `Vehicle is currently in ${vehicle.status} status` });
    }

    if (driver.status === 'On Trip') {
      return res.status(400).json({ error: 'Driver is already assigned to another active trip' });
    }
    if (driver.status === 'Suspended' || driver.status === 'Off Duty') {
      return res.status(400).json({ error: `Driver is currently ${driver.status}` });
    }

    // Set Trip to Dispatched, Vehicle to On Trip, Driver to On Trip
    await run("UPDATE trips SET status = 'Dispatched' WHERE id = ?", [tripId]);
    await run("UPDATE vehicles SET status = 'On Trip' WHERE registration_number = ?", [trip.vehicle_reg_no]);
    await run("UPDATE drivers SET status = 'On Trip' WHERE id = ?", [trip.driver_id]);

    res.json({ message: 'Trip successfully dispatched', status: 'Dispatched' });
  } catch (err) {
    console.error('Error dispatching trip:', err);
    res.status(500).json({ error: 'Failed to dispatch trip' });
  }
});

// Cancel Trip (Dispatcher only)
router.post('/:id/cancel', authenticateToken, authorizeRoles('Dispatcher'), async (req, res) => {
  const tripId = req.params.id;

  try {
    const trip = await get('SELECT * FROM trips WHERE id = ?', [tripId]);
    if (!trip) {
      return res.status(404).json({ error: 'Trip not found' });
    }
    if (trip.status === 'Completed' || trip.status === 'Cancelled') {
      return res.status(400).json({ error: `Cannot cancel a trip that is already ${trip.status}` });
    }

    if (trip.status === 'Dispatched') {
      // If it was already dispatched, restore vehicle and driver to Available
      await run("UPDATE vehicles SET status = 'Available' WHERE registration_number = ?", [trip.vehicle_reg_no]);
      await run("UPDATE drivers SET status = 'Available' WHERE id = ?", [trip.driver_id]);
    }

    await run("UPDATE trips SET status = 'Cancelled' WHERE id = ?", [tripId]);
    res.json({ message: 'Trip successfully cancelled', status: 'Cancelled' });
  } catch (err) {
    console.error('Error cancelling trip:', err);
    res.status(500).json({ error: 'Failed to cancel trip' });
  }
});

// Complete Trip (Dispatcher only)
router.post('/:id/complete', authenticateToken, authorizeRoles('Dispatcher'), async (req, res) => {
  const tripId = req.params.id;
  const { final_odometer, actual_fuel_consumed, fuel_cost } = req.body;

  if (final_odometer === undefined || actual_fuel_consumed === undefined) {
    return res.status(400).json({ error: 'Final odometer and fuel consumed are required' });
  }

  const finalOdo = parseFloat(final_odometer);
  const fuelConsumed = parseFloat(actual_fuel_consumed);
  const costOfFuel = fuel_cost ? parseFloat(fuel_cost) : fuelConsumed * 95; // Default to 95 Rs/L if not provided

  try {
    const trip = await get('SELECT * FROM trips WHERE id = ?', [tripId]);
    if (!trip) {
      return res.status(404).json({ error: 'Trip not found' });
    }
    if (trip.status !== 'Dispatched') {
      return res.status(400).json({ error: `Only dispatched trips can be completed. Current status: ${trip.status}` });
    }

    const vehicle = await get('SELECT * FROM vehicles WHERE registration_number = ?', [trip.vehicle_reg_no]);

    if (finalOdo < vehicle.odometer) {
      return res.status(400).json({ 
        error: `Final odometer (${finalOdo} km) cannot be less than the vehicle's current odometer (${vehicle.odometer} km)` 
      });
    }

    const completedAtStr = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const dateStr = completedAtStr.split(' ')[0];

    // Complete the trip
    await run(
      `UPDATE trips 
       SET status = 'Completed', 
           actual_fuel_consumed = ?, 
           final_odometer = ?, 
           completed_at = ? 
       WHERE id = ?`,
      [fuelConsumed, finalOdo, completedAtStr, tripId]
    );

    // Update vehicle's odometer and status
    await run(
      "UPDATE vehicles SET odometer = ?, status = 'Available' WHERE registration_number = ?",
      [finalOdo, trip.vehicle_reg_no]
    );

    // Update driver status
    await run(
      "UPDATE drivers SET status = 'Available' WHERE id = ?",
      [trip.driver_id]
    );

    // Automatically record Fuel Log
    await run(
      "INSERT INTO fuel_logs (vehicle_reg_no, liters, cost, date, trip_id) VALUES (?, ?, ?, ?, ?)",
      [trip.vehicle_reg_no, fuelConsumed, costOfFuel, dateStr, tripId]
    );

    // Automatically record Fuel Expense
    await run(
      "INSERT INTO expenses (vehicle_reg_no, trip_id, type, cost, date, description) VALUES (?, ?, 'Fuel', ?, ?, ?)",
      [trip.vehicle_reg_no, tripId, costOfFuel, dateStr, `Fuel expense for Trip #${tripId}`]
    );

    res.json({ message: 'Trip successfully completed', status: 'Completed' });
  } catch (err) {
    console.error('Error completing trip:', err);
    res.status(500).json({ error: 'Failed to complete trip' });
  }
});

export default router;
