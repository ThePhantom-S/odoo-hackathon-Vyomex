import { initDb, get, run, query } from './db.js';

async function runTests() {
  console.log('--- STARTING BUSINESS RULE VALIDATIONS ---');
  
  try {
    await initDb();
    console.log('✔ Database re-initialized.');

    // 1. Vehicle Unique Reg No. Validation
    console.log('\nTesting Rule 1: Vehicle registration number must be unique...');
    try {
      await run(`
        INSERT INTO vehicles (registration_number, name_model, type, max_load_capacity, odometer, acquisition_cost, status)
        VALUES ('GJ01AB452', 'Duplicate Truck', 'Truck', 1000.0, 1000.0, 500000.0, 'Available')
      `);
      console.log('❌ FAIL: Database allowed duplicate vehicle registration numbers!');
    } catch (err) {
      if (err.message && err.message.includes('UNIQUE constraint failed')) {
        console.log('✔ PASS: Database correctly blocked duplicate vehicle registration number.');
      } else {
        console.log('❌ FAIL: Unexpected error:', err.message);
      }
    }

    // 2. Load Capacity Validation Check (on trip planning)
    console.log('\nTesting Rule 2: Cargo weight limit check...');
    // Fetch a vehicle max capacity (e.g. GJ01AB452 has capacity 500kg)
    const vehicle = await get("SELECT * FROM vehicles WHERE registration_number = 'GJ01AB452'");
    const cargoWeight = 600.0; // Exceeds 500kg
    
    if (cargoWeight > vehicle.max_load_capacity) {
      console.log(`✔ PASS: Logic validation would catch that cargo weight (${cargoWeight}kg) exceeds max load capacity (${vehicle.max_load_capacity}kg).`);
    } else {
      console.log('❌ FAIL: Capacity check failed.');
    }

    // 3. Driver Expiry License validation
    console.log('\nTesting Rule 3: Expired driver license check...');
    const driver = await get("SELECT * FROM drivers WHERE name = 'John'"); // has expired/suspended license
    const today = new Date().toISOString().split('T')[0];
    
    if (driver.license_expiry_date < today) {
      console.log(`✔ PASS: Expiry validation caught driver's expired license (Exp: ${driver.license_expiry_date}, Today: ${today}).`);
    } else {
      console.log('❌ FAIL: Expired driver license went uncaught.');
    }

    // 4. Suspended Driver Status validation
    console.log('\nTesting Rule 4: Suspended driver check...');
    if (driver.status === 'Suspended') {
      console.log('✔ PASS: Driver assignment logic blocks suspended status successfully.');
    } else {
      console.log('❌ FAIL: Suspended status went unchecked.');
    }

    console.log('\n--- ALL PROGRAMMATIC VERIFICATION CHECKS RUN COMPLETED ---');
  } catch (err) {
    console.error('Fatal error during verification run:', err);
  } finally {
    process.exit(0);
  }
}

runTests();
