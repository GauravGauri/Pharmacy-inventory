import { Request, Response } from 'express';
import { SalesInvoice } from '../models/SalesInvoice.js';
import { PurchaseInvoice } from '../models/PurchaseInvoice.js';
import { Batch } from '../models/Batch.js';
import { Medicine } from '../models/Medicine.js';

export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    // Today's Sales
    const todaySales = await SalesInvoice.aggregate([
      { $match: { invoiceDate: { $gte: todayStart, $lte: todayEnd } } },
      { $group: { _id: null, total: { $sum: '$netAmount' } } }
    ]);
    const salesToday = todaySales.length > 0 ? todaySales[0].total : 0;

    // Total Inventory Valuation (purchaseRate * quantity)
    const valuationAgg = await Batch.aggregate([
      { $match: { quantity: { $gt: 0 } } },
      { $group: { _id: null, total: { $sum: { $multiply: ['$quantity', '$purchaseRate'] } } } }
    ]);
    const inventoryValuation = valuationAgg.length > 0 ? valuationAgg[0].total : 0;

    // Near Expiry Count (expiring in the next 3 months)
    const threeMonthsFromNow = new Date();
    threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);
    const expiringSoonCount = await Batch.countDocuments({
      quantity: { $gt: 0 },
      expiryDate: { $lte: threeMonthsFromNow, $gt: new Date() }
    });

    // Low Stock Count
    // For each active medicine, if total batch quantity < minStockLevel
    const activeMedicines = await Medicine.find({ status: 'active' });
    let lowStockCount = 0;
    const lowStockList: any[] = [];

    for (const med of activeMedicines) {
      const batches = await Batch.find({ medicineId: med._id, quantity: { $gt: 0 } });
      const totalStock = batches.reduce((sum, b) => sum + b.quantity, 0);
      if (totalStock <= med.minStockLevel) {
        lowStockCount++;
        lowStockList.push({
          id: med._id,
          name: med.name,
          minStockLevel: med.minStockLevel,
          totalStock
        });
      }
    }

    // Expiring Soon List
    const expiringBatches = await Batch.find({
      quantity: { $gt: 0 },
      expiryDate: { $lte: threeMonthsFromNow, $gt: new Date() }
    })
      .populate('medicineId', 'name shelf')
      .sort({ expiryDate: 1 })
      .limit(5);

    res.status(200).json({
      stats: {
        salesToday: Math.round(salesToday * 100) / 100,
        inventoryValuation: Math.round(inventoryValuation * 100) / 100,
        expiringSoonCount,
        lowStockCount,
      },
      lowStockList: lowStockList.slice(0, 5),
      expiringBatches,
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Server error retrieving dashboard stats', error: error.message });
  }
};

export const getSalesChartData = async (req: Request, res: Response) => {
  try {
    const days = Number(req.query.days) || 7;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days + 1);
    startDate.setHours(0, 0, 0, 0);

    const sales = await SalesInvoice.aggregate([
      { $match: { invoiceDate: { $gte: startDate } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$invoiceDate' } },
          totalSales: { $sum: '$netAmount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Fill in missing dates with zero sales
    const chartData = [];
    const dateMap = new Map(sales.map(s => [s._id, s]));

    for (let i = 0; i < days; i++) {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      const entry = dateMap.get(dateStr);
      
      chartData.push({
        date: dateStr,
        sales: entry ? Math.round(entry.totalSales * 100) / 100 : 0,
        count: entry ? entry.count : 0
      });
    }

    res.status(200).json(chartData);
  } catch (error: any) {
    res.status(500).json({ message: 'Server error retrieving chart data', error: error.message });
  }
};
