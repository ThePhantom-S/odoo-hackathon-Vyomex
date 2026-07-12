import express from 'express';
import { query, get } from '../db.js';
import { authenticateToken, authorizeRoles } from '../server.js';

const router = express.Router();

// Get analytics data (Fleet Manager, Financial Analyst)
router.get('/analytics', authenticateToken, authorizeRoles('Fleet Manager', 'Financial Analyst'), async (req, res) => {
  try {
    // 1. Calculate General KPIs
    // Active Vehicles (On Trip), Available, In Shop, Retired
    const vStats = await query(`
      SELECT status, COUNT(*) as count 
      FROM vehicles 
      GROUP BY status
    `);
    
    const statsMap = { Available: 0, 'On Trip': 0, 'In Shop': 0, Retired: 0 };
    vStats.forEach(item => {
      statsMap[item.status] = item.count;
    });

    const totalActiveFleet = statsMap['Available'] + statsMap['On Trip'] + statsMap['In Shop'];
    const fleetUtilization = totalActiveFleet > 0 
      ? Math.round((statsMap['On Trip'] / totalActiveFleet) * 100) 
      : 0;

    // Trip counts
    const tStats = await query(`
      SELECT status, COUNT(*) as count 
      FROM trips 
      GROUP BY status
    `);
    const tripMap = { Draft: 0, Dispatched: 0, Completed: 0, Cancelled: 0 };
    tStats.forEach(item => {
      tripMap[item.status] = item.count;
    });

    // Driver counts
    const dStats = await query(`
      SELECT status, COUNT(*) as count 
      FROM drivers 
      GROUP BY status
    `);
    const driverMap = { Available: 0, 'On Trip': 0, 'Off Duty': 0, Suspended: 0 };
    dStats.forEach(item => {
      driverMap[item.status] = item.count;
    });

    const driversOnDuty = driverMap['Available'] + driverMap['On Trip'];

    // 2. Calculate Vehicle Reports: ROI, Fuel Efficiency, Operational Cost
    const vehicleAnalytics = await query(`
      SELECT 
        v.registration_number,
        v.name_model,
        v.type,
        v.acquisition_cost,
        v.status,
        -- Revenue from completed trips
        COALESCE((SELECT SUM(t.revenue) FROM trips t WHERE t.vehicle_reg_no = v.registration_number AND t.status = 'Completed'), 0) as total_revenue,
        -- Total distance from completed trips
        COALESCE((SELECT SUM(t.planned_distance) FROM trips t WHERE t.vehicle_reg_no = v.registration_number AND t.status = 'Completed'), 0) as total_distance,
        -- Total actual fuel consumed
        COALESCE((SELECT SUM(t.actual_fuel_consumed) FROM trips t WHERE t.vehicle_reg_no = v.registration_number AND t.status = 'Completed'), 0) as total_fuel_liters,
        -- Fuel cost
        COALESCE((SELECT SUM(e.cost) FROM expenses e WHERE e.vehicle_reg_no = v.registration_number AND e.type = 'Fuel'), 0) as fuel_cost,
        -- Maintenance cost
        COALESCE((SELECT SUM(e.cost) FROM expenses e WHERE e.vehicle_reg_no = v.registration_number AND e.type = 'Maintenance'), 0) as maintenance_cost,
        -- Other expenses (tolls, miscellaneous)
        COALESCE((SELECT SUM(e.cost) FROM expenses e WHERE e.vehicle_reg_no = v.registration_number AND e.type IN ('Toll', 'Other')), 0) as other_cost
      FROM vehicles v
    `);

    const formattedVehicleData = vehicleAnalytics.map(v => {
      const fuelAndMaint = v.fuel_cost + v.maintenance_cost;
      const totalOpCost = fuelAndMaint + v.other_cost;
      
      // Fuel Efficiency = Distance / Fuel consumed
      const fuelEfficiency = v.total_fuel_liters > 0 
        ? parseFloat((v.total_distance / v.total_fuel_liters).toFixed(2)) 
        : 0;

      // ROI = (Revenue - (Maintenance + Fuel)) / Acquisition Cost
      const roiPercent = v.acquisition_cost > 0 
        ? parseFloat((((v.total_revenue - fuelAndMaint) / v.acquisition_cost) * 100).toFixed(2)) 
        : 0;

      return {
        registration_number: v.registration_number,
        name_model: v.name_model,
        type: v.type,
        status: v.status,
        acquisition_cost: v.acquisition_cost,
        total_revenue: v.total_revenue,
        total_distance: v.total_distance,
        total_fuel_liters: v.total_fuel_liters,
        fuel_cost: v.fuel_cost,
        maintenance_cost: v.maintenance_cost,
        operational_cost: totalOpCost,
        fuel_efficiency,
        roi: roiPercent
      };
    });

    // 3. Monthly revenue and costs for charts
    // Let's generate a mockup or simple aggregation if SQLite dates support it (since date is stored as YYYY-MM-DD)
    const monthlyData = await query(`
      SELECT 
        strftime('%Y-%m', date) as month,
        SUM(CASE WHEN type = 'Fuel' OR type = 'Maintenance' OR type = 'Toll' OR type = 'Other' THEN cost ELSE 0 END) as cost
      FROM expenses
      GROUP BY month
      ORDER BY month ASC
    `);

    const monthlyRevenue = await query(`
      SELECT 
        strftime('%Y-%m', completed_at) as month,
        SUM(revenue) as revenue
      FROM trips
      WHERE status = 'Completed'
      GROUP BY month
      ORDER BY month ASC
    `);

    // Merge monthly revenues and costs
    const monthlyMerged = {};
    monthlyData.forEach(item => {
      if (item.month) {
        monthlyMerged[item.month] = { month: item.month, cost: item.cost, revenue: 0 };
      }
    });
    monthlyRevenue.forEach(item => {
      if (item.month) {
        if (!monthlyMerged[item.month]) {
          monthlyMerged[item.month] = { month: item.month, cost: 0, revenue: 0 };
        }
        monthlyMerged[item.month].revenue = item.revenue;
      }
    });

    const monthlyChartData = Object.values(monthlyMerged).sort((a, b) => a.month.localeCompare(b.month));

    res.json({
      kpis: {
        activeVehicles: statsMap['On Trip'],
        availableVehicles: statsMap['Available'],
        maintenanceVehicles: statsMap['In Shop'],
        activeTrips: tripMap['Dispatched'],
        pendingTrips: tripMap['Draft'],
        driversOnDuty,
        fleetUtilization
      },
      vehicles: formattedVehicleData,
      monthlyChartData
    });
  } catch (err) {
    console.error('Error generating analytics report:', err);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

// CSV Export for Vehicles report (Fleet Manager, Financial Analyst)
router.get('/export-csv', authenticateToken, authorizeRoles('Fleet Manager', 'Financial Analyst'), async (req, res) => {
  try {
    const data = await query(`
      SELECT 
        v.registration_number,
        v.name_model,
        v.type,
        v.status,
        v.odometer,
        v.acquisition_cost,
        COALESCE((SELECT SUM(t.revenue) FROM trips t WHERE t.vehicle_reg_no = v.registration_number AND t.status = 'Completed'), 0) as total_revenue,
        COALESCE((SELECT SUM(e.cost) FROM expenses e WHERE e.vehicle_reg_no = v.registration_number), 0) as total_expenses
      FROM vehicles v
    `);

    let csvContent = 'Registration Number,Model,Type,Status,Odometer (km),Acquisition Cost,Total Revenue,Total Expenses,ROI (%)\n';
    
    data.forEach(v => {
      const roi = v.acquisition_cost > 0 
        ? (((v.total_revenue - v.total_expenses) / v.acquisition_cost) * 100).toFixed(2)
        : 0;
      csvContent += `"${v.registration_number}","${v.name_model}","${v.type}","${v.status}",${v.odometer},${v.acquisition_cost},${v.total_revenue},${v.total_expenses},${roi}\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=transitops_fleet_report.csv');
    res.status(200).send(csvContent);
  } catch (err) {
    console.error('Error exporting CSV:', err);
    res.status(500).json({ error: 'Failed to export CSV report' });
  }
});

export default router;
