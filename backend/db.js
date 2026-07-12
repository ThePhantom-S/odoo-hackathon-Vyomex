import sqlite3 from 'sqlite3';
import bcrypt from 'bcryptjs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.resolve(__dirname, 'transitops.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error connecting to SQLite database:', err.message);
  } else {
    console.log('Connected to the TransitOps SQLite database at:', dbPath);
    db.run('PRAGMA foreign_keys = ON;', (pragmaErr) => {
      if (pragmaErr) {
        console.error('Failed to enable foreign key constraints:', pragmaErr);
      } else {
        console.log('Foreign key constraints enabled.');
      }
    });
  }
});

// Helper function to execute queries synchronously-ish (as promises)
export const query = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

export const run = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  });
};

export const get = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

export const initDb = async () => {
  // Create tables
  await run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('Fleet Manager', 'Dispatcher', 'Safety Officer', 'Financial Analyst')),
      name TEXT NOT NULL
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS vehicles (
      registration_number TEXT PRIMARY KEY,
      name_model TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('Van', 'Truck', 'Mini', 'Sedan')),
      max_load_capacity REAL NOT NULL,
      odometer REAL NOT NULL,
      acquisition_cost REAL NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('Available', 'On Trip', 'In Shop', 'Retired')) DEFAULT 'Available',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS drivers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      license_number TEXT UNIQUE NOT NULL,
      license_category TEXT NOT NULL,
      license_expiry_date TEXT NOT NULL,
      contact_number TEXT NOT NULL,
      safety_score REAL NOT NULL CHECK(safety_score >= 0 AND safety_score <= 100) DEFAULT 100,
      status TEXT NOT NULL CHECK(status IN ('Available', 'On Trip', 'Off Duty', 'Suspended')) DEFAULT 'Available',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS trips (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source TEXT NOT NULL,
      destination TEXT NOT NULL,
      vehicle_reg_no TEXT NOT NULL,
      driver_id INTEGER NOT NULL,
      cargo_weight REAL NOT NULL,
      planned_distance REAL NOT NULL,
      revenue REAL NOT NULL DEFAULT 0,
      actual_fuel_consumed REAL,
      final_odometer REAL,
      status TEXT NOT NULL CHECK(status IN ('Draft', 'Dispatched', 'Completed', 'Cancelled')) DEFAULT 'Draft',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME,
      FOREIGN KEY (vehicle_reg_no) REFERENCES vehicles(registration_number) ON DELETE RESTRICT,
      FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE RESTRICT
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS maintenance_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vehicle_reg_no TEXT NOT NULL,
      service_type TEXT NOT NULL,
      cost REAL NOT NULL,
      date TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('Active', 'Completed')) DEFAULT 'Active',
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (vehicle_reg_no) REFERENCES vehicles(registration_number) ON DELETE RESTRICT
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS fuel_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vehicle_reg_no TEXT NOT NULL,
      liters REAL NOT NULL,
      cost REAL NOT NULL,
      date TEXT NOT NULL,
      trip_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (vehicle_reg_no) REFERENCES vehicles(registration_number) ON DELETE RESTRICT,
      FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE SET NULL
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vehicle_reg_no TEXT NOT NULL,
      trip_id INTEGER,
      type TEXT NOT NULL CHECK(type IN ('Toll', 'Maintenance', 'Fuel', 'Other')),
      cost REAL NOT NULL,
      date TEXT NOT NULL,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (vehicle_reg_no) REFERENCES vehicles(registration_number) ON DELETE RESTRICT,
      FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE SET NULL
    )
  `);

  // Seed data
  const userCount = await get('SELECT COUNT(*) as count FROM users');
  if (userCount.count === 0) {
    console.log('Seeding database with initial users...');
    const salt = bcrypt.genSaltSync(10);
    const passHash = bcrypt.hashSync('password123', salt);

    await run('INSERT INTO users (email, password_hash, role, name) VALUES (?, ?, ?, ?)', [
      'manager@transitops.com', passHash, 'Fleet Manager', 'Raven K. (Fleet Manager)'
    ]);
    await run('INSERT INTO users (email, password_hash, role, name) VALUES (?, ?, ?, ?)', [
      'dispatcher@transitops.com', passHash, 'Dispatcher', 'Jenish S. (Dispatcher)'
    ]);
    await run('INSERT INTO users (email, password_hash, role, name) VALUES (?, ?, ?, ?)', [
      'safety@transitops.com', passHash, 'Safety Officer', 'Jackson J. (Safety Officer)'
    ]);
    await run('INSERT INTO users (email, password_hash, role, name) VALUES (?, ?, ?, ?)', [
      'analyst@transitops.com', passHash, 'Financial Analyst', 'Hari K. (Financial Analyst)'
    ]);
  }

  const vehicleCount = await get('SELECT COUNT(*) as count FROM vehicles');
  if (vehicleCount.count === 0) {
    console.log('Seeding initial vehicles...');
    await run('INSERT INTO vehicles (registration_number, name_model, type, max_load_capacity, odometer, acquisition_cost, status) VALUES (?, ?, ?, ?, ?, ?, ?)', [
      'GJ01AB452', 'VAN-05 (Tata Ace)', 'Van', 500.0, 77200.0, 620000.0, 'On Trip'
    ]);
    await run('INSERT INTO vehicles (registration_number, name_model, type, max_load_capacity, odometer, acquisition_cost, status) VALUES (?, ?, ?, ?, ?, ?, ?)', [
      'GJ01AB998', 'TRUCK-11 (Ashok Leyland)', 'Truck', 5000.0, 182000.0, 2450000.0, 'On Trip'
    ]);
    await run('INSERT INTO vehicles (registration_number, name_model, type, max_load_capacity, odometer, acquisition_cost, status) VALUES (?, ?, ?, ?, ?, ?, ?)', [
      'GJ01AB120', 'MINI-03 (Mahindra Supro)', 'Mini', 1000.0, 68900.0, 410000.0, 'In Shop'
    ]);
    await run('INSERT INTO vehicles (registration_number, name_model, type, max_load_capacity, odometer, acquisition_cost, status) VALUES (?, ?, ?, ?, ?, ?, ?)', [
      'GJ01AB008', 'VAN-09 (Mahindra Jeeto)', 'Van', 750.0, 241900.0, 590000.0, 'Retired'
    ]);
  }

  const driverCount = await get('SELECT COUNT(*) as count FROM drivers');
  if (driverCount.count === 0) {
    console.log('Seeding initial drivers...');
    await run('INSERT INTO drivers (name, license_number, license_category, license_expiry_date, contact_number, safety_score, status) VALUES (?, ?, ?, ?, ?, ?, ?)', [
      'Alex', 'DL-88213', 'LMV', '2028-12-31', '9876543210', 96.0, 'On Trip'
    ]);
    await run('INSERT INTO drivers (name, license_number, license_category, license_expiry_date, contact_number, safety_score, status) VALUES (?, ?, ?, ?, ?, ?, ?)', [
      'John', 'DL-44120', 'HMV', '2025-03-15', '9822011223', 81.0, 'Suspended'
    ]);
    await run('INSERT INTO drivers (name, license_number, license_category, license_expiry_date, contact_number, safety_score, status) VALUES (?, ?, ?, ?, ?, ?, ?)', [
      'Priya', 'DL-77031', 'LMV', '2027-08-20', '9911033445', 99.0, 'On Trip'
    ]);
    await run('INSERT INTO drivers (name, license_number, license_category, license_expiry_date, contact_number, safety_score, status) VALUES (?, ?, ?, ?, ?, ?, ?)', [
      'Suresh', 'DL-90045', 'HMV', '2027-01-10', '9744099887', 88.0, 'Off Duty'
    ]);
    await run('INSERT INTO drivers (name, license_number, license_category, license_expiry_date, contact_number, safety_score, status) VALUES (?, ?, ?, ?, ?, ?, ?)', [
      'Vikram', 'DL-11002', 'HMV', '2026-07-20', '9722055667', 92.0, 'Available' // License expires in a few days relative to 2026-07-12
    ]);
  }

  const tripCount = await get('SELECT COUNT(*) as count FROM trips');
  if (tripCount.count === 0) {
    console.log('Seeding initial trips and logs...');
    // Seed some completed historical trips to generate reports
    // Trip 1
    await run(`
      INSERT INTO trips (id, source, destination, vehicle_reg_no, driver_id, cargo_weight, planned_distance, revenue, actual_fuel_consumed, final_odometer, status, created_at, completed_at)
      VALUES (1, 'Gandhinagar Depot: Sector 25, GIDC Electronics Estate, Gandhinagar, Gujarat 382025', 'Ahmedabad Hub: Plot 45, GIDC Industrial Estate, Vatva, Ahmedabad, Gujarat 382445', 'GJ01AB452', 1, 400.0, 30.0, 4500.0, 4.0, 74030.0, 'Completed', '2026-07-05 09:00:00', '2026-07-05 10:30:00')
    `);
    await run("INSERT INTO fuel_logs (vehicle_reg_no, liters, cost, date, trip_id) VALUES ('GJ01AB452', 4.0, 380.0, '2026-07-05', 1)");
    await run("INSERT INTO expenses (vehicle_reg_no, trip_id, type, cost, date, description) VALUES ('GJ01AB452', 1, 'Toll', 120.0, '2026-07-05', 'NH8 Toll')");
    await run("INSERT INTO expenses (vehicle_reg_no, trip_id, type, cost, date, description) VALUES ('GJ01AB452', 1, 'Fuel', 380.0, '2026-07-05', 'Trip Fuel')");

    // Trip 2
    await run(`
      INSERT INTO trips (id, source, destination, vehicle_reg_no, driver_id, cargo_weight, planned_distance, revenue, actual_fuel_consumed, final_odometer, status, created_at, completed_at)
      VALUES (2, 'Sanand Warehouse: Sarkhej-Viramgam Highway, Sanand GIDC, Ahmedabad, Gujarat 382110', 'Vadodara Transit Hub: National Highway 8, Ranoli, Vadodara, Gujarat 391350', 'GJ01AB998', 5, 4500.0, 60.0, 18000.0, 15.0, 182060.0, 'Completed', '2026-07-06 08:00:00', '2026-07-06 11:00:00')
    `);
    await run("INSERT INTO fuel_logs (vehicle_reg_no, liters, cost, date, trip_id) VALUES ('GJ01AB998', 15.0, 1425.0, '2026-07-06', 2)");
    await run("INSERT INTO expenses (vehicle_reg_no, trip_id, type, cost, date, description) VALUES ('GJ01AB998', 2, 'Toll', 340.0, '2026-07-06', 'Ring Road Toll')");
    await run("INSERT INTO expenses (vehicle_reg_no, trip_id, type, cost, date, description) VALUES ('GJ01AB998', 2, 'Other', 150.0, '2026-07-06', 'Loading assistance')");
    await run("INSERT INTO expenses (vehicle_reg_no, trip_id, type, cost, date, description) VALUES ('GJ01AB998', 2, 'Fuel', 1425.0, '2026-07-06', 'Trip Fuel')");

    // Seed Active Dispatched Trips (Trip 3 and Trip 4)
    await run(`
      INSERT INTO trips (id, source, destination, vehicle_reg_no, driver_id, cargo_weight, planned_distance, revenue, status, created_at)
      VALUES (3, 'Gandhinagar Depot: Sector 25, GIDC Electronics Estate, Gandhinagar, Gujarat 382025', 'Vadodara Transit Hub: National Highway 8, Ranoli, Vadodara, Gujarat 391350', 'GJ01AB452', 1, 400.0, 115.0, 12000.0, 'Dispatched', '2026-07-12 11:30:00')
    `);
    await run(`
      INSERT INTO trips (id, source, destination, vehicle_reg_no, driver_id, cargo_weight, planned_distance, revenue, status, created_at)
      VALUES (4, 'Sanand Warehouse: Sarkhej-Viramgam Highway, Sanand GIDC, Ahmedabad, Gujarat 382110', 'Ahmedabad Hub: Plot 45, GIDC Industrial Estate, Vatva, Ahmedabad, Gujarat 382445', 'GJ01AB998', 3, 3500.0, 45.0, 8500.0, 'Dispatched', '2026-07-12 13:15:00')
    `);

    // Active maintenance log for the In Shop vehicle
    await run("INSERT INTO maintenance_logs (vehicle_reg_no, service_type, cost, date, status, notes) VALUES ('GJ01AB120', 'Tyre Replace', 6200.0, '2026-07-10', 'Active', 'Replacing front 2 tyres')");
    await run("INSERT INTO expenses (vehicle_reg_no, type, cost, date, description) VALUES ('GJ01AB120', 'Maintenance', 6200.0, '2026-07-10', 'Tyre Replacement')");
  }
};

export default db;
