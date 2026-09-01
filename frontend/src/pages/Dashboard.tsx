import React, { useEffect, useState } from 'react';
import { reportApi, stockApi } from '../api/services';
import { DailySummaryReport, CurrentStock } from '../types';
import {
  Users,
  Wine,
  Calendar,
  AlertTriangle,
  RefreshCw,
  Loader2,
  Flame,
  Tag,
  CheckCircle2,
} from 'lucide-react';

export const Dashboard: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [summary, setSummary] = useState<DailySummaryReport | null>(null);
  const [lowStock, setLowStock] = useState<CurrentStock[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const loadDashboardData = async () => {
    try {
      setRefreshing(true);
      const summaryData = await reportApi.getDailySummary(selectedDate);
      setSummary(summaryData);

      const stockData = await stockApi.getAllCurrentStock();
      const lowStockItems = stockData.filter((item) => item.current_stock <= 5);
      setLowStock(lowStockItems);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [selectedDate]);

  const totalPeople = summary?.total_people_entered ?? 0;
  const totalBottles = summary?.total_bottles_sold ?? 0;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Header & Simple Date Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#161b22] border border-[#21262d] p-5 rounded-2xl shadow-lg">
        <div>
          <h2 className="text-2xl font-black text-slate-100 tracking-tight">Today's Bar Overview</h2>
          <p className="text-xs text-slate-400 mt-1">Simple summary of customer entries, drink sales & stock alerts</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-[#0d1117] border border-[#30363d] rounded-xl px-3.5 py-2">
            <Calendar className="w-4 h-4 text-amber-400" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-slate-100 font-bold text-xs focus:outline-none"
            />
          </div>

          <button
            onClick={loadDashboardData}
            disabled={refreshing}
            className="p-2.5 rounded-xl bg-[#0d1117] border border-[#30363d] hover:bg-[#21262d] text-slate-300 transition-colors"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-amber-400' : ''}`} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-2">
          <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
          <span className="text-sm font-bold">Loading daily overview...</span>
        </div>
      ) : (
        <>
          {/* Big Simple Cards (Everyday Words) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Card 1: Total People */}
            <div className="bg-[#161b22] border border-[#21262d] p-6 rounded-2xl shadow-lg relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-400 uppercase tracking-wider">
                  People Entered Today
                </span>
                <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center">
                  <Users className="w-5 h-5" />
                </div>
              </div>
              <p className="text-4xl font-black text-slate-100 font-mono mt-4">
                {totalPeople}
              </p>
              <p className="text-xs text-slate-400 mt-1 font-semibold">
                {summary?.customers_entered ?? 0} Members + {summary?.additional_guests ?? 0} Guests
              </p>
            </div>

            {/* Card 2: Total Bottles Sold */}
            <div className="bg-[#161b22] border border-[#21262d] p-6 rounded-2xl shadow-lg relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-400 uppercase tracking-wider">
                  Bottles Sold Today
                </span>
                <div className="w-10 h-10 rounded-xl bg-purple-500/15 text-purple-400 flex items-center justify-center">
                  <Wine className="w-5 h-5" />
                </div>
              </div>
              <p className="text-4xl font-black text-amber-400 font-mono mt-4">
                {totalBottles}
              </p>
              <p className="text-xs text-slate-400 mt-1 font-semibold">Total drinks sold on date</p>
            </div>

            {/* Card 3: Stock Refill Alert */}
            <div className="bg-[#161b22] border border-[#21262d] p-6 rounded-2xl shadow-lg relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-400 uppercase tracking-wider">
                  Stock Refill Alert
                </span>
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    lowStock.length > 0
                      ? 'bg-rose-500/15 text-rose-400 animate-pulse'
                      : 'bg-emerald-500/15 text-emerald-400'
                  }`}
                >
                  {lowStock.length > 0 ? <AlertTriangle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
                </div>
              </div>

              <p
                className={`text-4xl font-black font-mono mt-4 ${
                  lowStock.length > 0 ? 'text-rose-400' : 'text-emerald-400'
                }`}
              >
                {lowStock.length}
              </p>
              <p className="text-xs text-slate-400 mt-1 font-semibold">
                {lowStock.length > 0 ? 'Items running low on stock!' : 'All drinks well stocked!'}
              </p>
            </div>
          </div>

          {/* Low Stock Warning Banner for Bar Staff */}
          {lowStock.length > 0 && (
            <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-5 shadow-lg">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-5 h-5 text-rose-400" />
                <h3 className="text-sm font-extrabold text-rose-200 uppercase tracking-wide">
                  ⚠️ Bring these drinks from Cellar/Store ({lowStock.length} items low)
                </h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {lowStock.map((item) => (
                  <div
                    key={item.product_id}
                    className="bg-[#0d1117] border border-rose-500/40 px-4 py-3 rounded-xl flex items-center justify-between"
                  >
                    <span className="font-extrabold text-slate-100 text-sm">{item.product_name}</span>
                    <span className="px-2.5 py-1 rounded-lg bg-rose-500/20 text-rose-300 font-mono font-black text-xs">
                      {item.current_stock} left
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Clean Visual Drink Summaries */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Selling Drinks */}
            <div className="bg-[#161b22] border border-[#21262d] rounded-2xl p-6 shadow-lg">
              <div className="flex items-center gap-2 mb-4">
                <Flame className="w-5 h-5 text-amber-400 fill-amber-400" />
                <h3 className="text-base font-extrabold text-slate-100 uppercase tracking-wider">
                  Top Selling Drinks Today
                </h3>
              </div>

              {!summary?.products || summary.products.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-sm border-2 border-dashed border-[#21262d] rounded-xl">
                  No sales recorded for this date yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {summary.products.map((item) => {
                    const percentage = totalBottles > 0 ? Math.round((item.quantity_sold / totalBottles) * 100) : 0;
                    return (
                      <div
                        key={item.product_id}
                        className="bg-[#0d1117] border border-[#21262d] p-4 rounded-xl space-y-2"
                      >
                        <div className="flex items-center justify-between text-sm">
                          <div>
                            <span className="font-extrabold text-slate-100 text-base">{item.product_name}</span>
                            <span className="text-xs text-slate-400 block font-mono">Brand: {item.brand_name}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-xl font-black text-amber-400 font-mono">
                              {item.quantity_sold}
                            </span>
                            <span className="text-[10px] text-slate-500 block font-mono">Bottles</span>
                          </div>
                        </div>

                        {/* Visual Progress Bar */}
                        <div className="w-full bg-[#21262d] h-2.5 rounded-full overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-amber-500 to-amber-400 h-full rounded-full transition-all duration-500"
                            style={{ width: `${Math.max(percentage, 8)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Sales by Brand */}
            <div className="bg-[#161b22] border border-[#21262d] rounded-2xl p-6 shadow-lg">
              <div className="flex items-center gap-2 mb-4">
                <Tag className="w-5 h-5 text-purple-400" />
                <h3 className="text-base font-extrabold text-slate-100 uppercase tracking-wider">
                  Sales by Brand Today
                </h3>
              </div>

              {!summary?.brands || summary.brands.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-sm border-2 border-dashed border-[#21262d] rounded-xl">
                  No brand sales recorded for this date yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {summary.brands.map((item) => (
                    <div
                      key={item.brand_id}
                      className="bg-[#0d1117] border border-[#21262d] p-4 rounded-xl flex items-center justify-between"
                    >
                      <div>
                        <span className="font-extrabold text-slate-100 text-base">{item.brand_name}</span>
                        <span className="text-xs text-slate-500 block font-mono">Brand #{item.brand_id}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-xl font-black text-purple-400 font-mono">
                          {item.quantity_sold}
                        </span>
                        <span className="text-[10px] text-slate-500 block font-mono">Bottles Sold</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
