"use client";

import React, { useEffect, useState } from "react";
import { $api } from "@/lib/api";

type Summary = {
  totalCount: number;
  totalPaid: string;
  totalRefund: string;
  netRevenue: string;
};

type Transaction = {
  id: string;
  method: string;
  status: string;
  amount: string;
  paidAt: string | null;
  booking: {
    bookingCode: string;
    guestName: string;
    property: { name: string };
  };
};

type OccupancyRow = {
  propertyId: string;
  propertyName: string;
  totalUnits: number;
  occupiedNights: number;
  availableNights: number;
  occupancyRate: number;
};

type MonthlyRevenueRow = {
  month: number;
  year: number;
  totalRevenue: string;
  bookingCount: number;
};

const fmtRp = (v: string | number) => "Rp" + Number(v).toLocaleString("id-ID");
const fmtDate = (d: string) => new Date(d).toISOString().slice(0, 10);

const monthNames = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

export default function ReportsPage() {
  const [tab, setTab] = useState<"revenue" | "occupancy" | "transactions">("revenue");
  
  // Data states
  const [summary, setSummary] = useState<Summary | null>(null);
  const [monthlyRevenue, setMonthlyRevenue] = useState<MonthlyRevenueRow[]>([]);
  const [occupancyData, setOccupancyData] = useState<OccupancyRow[]>([]);
  const [transactionsData, setTransactionsData] = useState<Transaction[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear());

  useEffect(() => {
    setLoading(true);
    if (tab === "revenue") {
      Promise.all([
        $api.get<Summary>("/reports/transactions/summary"),
        $api.get<MonthlyRevenueRow[]>(`/reports/revenue/monthly?year=${year}`),
      ])
        .then(([s, r]) => { setSummary(s); setMonthlyRevenue(r); })
        .catch(console.error)
        .finally(() => setLoading(false));
    } else if (tab === "occupancy") {
      $api.get<OccupancyRow[]>("/reports/occupancy")
        .then(setOccupancyData)
        .catch(console.error)
        .finally(() => setLoading(false));
    } else if (tab === "transactions") {
      $api.getList<Transaction>("/reports/transactions?limit=50")
        .then((res) => setTransactionsData(res.data))
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [tab, year]);

  const handleExport = (type: "transactions" | "occupancy", format: "pdf" | "excel") => {
    const token = localStorage.getItem("campku_token") ? JSON.parse(localStorage.getItem("campku_token")!).accessToken : "";
    const url = `${process.env.NEXT_PUBLIC_API_URL || ""}/reports/${type}?format=${format}`;
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => res.blob())
      .then((blob) => {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `${type}-report.${format === "excel" ? "xlsx" : "pdf"}`;
        a.click();
      })
      .catch((e) => alert("Export error: " + e.message));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800 dark:text-white/90">Laporan & Analisis</h2>
          <p className="text-sm text-gray-500">Ringkasan pendapatan, tingkat hunian, dan riwayat transaksi.</p>
        </div>
        <div className="flex gap-2">
          {tab === "transactions" && (
            <>
              <button onClick={() => handleExport("transactions", "pdf")} className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200">Export PDF</button>
              <button onClick={() => handleExport("transactions", "excel")} className="rounded-xl border border-green-300 bg-green-50 px-3 py-2 text-xs font-semibold text-green-700 hover:bg-green-100 dark:border-green-900/30 dark:bg-green-900/10">Export Excel</button>
            </>
          )}
          {tab === "occupancy" && (
            <>
              <button onClick={() => handleExport("occupancy", "pdf")} className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200">Export PDF</button>
              <button onClick={() => handleExport("occupancy", "excel")} className="rounded-xl border border-green-300 bg-green-50 px-3 py-2 text-xs font-semibold text-green-700 hover:bg-green-100 dark:border-green-900/30 dark:bg-green-900/10">Export Excel</button>
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-800 gap-6 text-sm font-semibold">
        <button onClick={() => setTab("revenue")} className={`pb-3 transition-colors ${tab === "revenue" ? "border-b-2 border-brand-500 text-brand-600 dark:text-brand-400" : "text-gray-500 hover:text-gray-700"}`}>Pendapatan Bulanan</button>
        <button onClick={() => setTab("occupancy")} className={`pb-3 transition-colors ${tab === "occupancy" ? "border-b-2 border-brand-500 text-brand-600 dark:text-brand-400" : "text-gray-500 hover:text-gray-700"}`}>Tingkat Hunian (Occupancy)</button>
        <button onClick={() => setTab("transactions")} className={`pb-3 transition-colors ${tab === "transactions" ? "border-b-2 border-brand-500 text-brand-600 dark:text-brand-400" : "text-gray-500 hover:text-gray-700"}`}>Riwayat Transaksi</button>
      </div>

      {loading && <div className="p-8 text-center text-sm text-gray-400">Loading laporan...</div>}

      {/* Tab 1: Revenue */}
      {!loading && tab === "revenue" && (
        <div className="space-y-6">
          {summary && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
                <span className="text-xs text-gray-400 block">Total Transaksi</span>
                <span className="text-2xl font-bold text-gray-800 dark:text-white/90">{summary.totalCount}</span>
              </div>
              <div className="rounded-2xl border border-green-200 bg-green-50/50 p-5 dark:border-green-900/30 dark:bg-green-900/10">
                <span className="text-xs text-green-600 block font-medium">Total Terbayar</span>
                <span className="text-2xl font-bold text-green-700 dark:text-green-400">{fmtRp(summary.totalPaid)}</span>
              </div>
              <div className="rounded-2xl border border-red-200 bg-red-50/50 p-5 dark:border-red-900/30 dark:bg-red-900/10">
                <span className="text-xs text-red-600 block font-medium">Total Refund</span>
                <span className="text-2xl font-bold text-red-700 dark:text-red-400">{fmtRp(summary.totalRefund)}</span>
              </div>
              <div className="rounded-2xl border border-brand-200 bg-brand-50/50 p-5 dark:border-brand-900/30 dark:bg-brand-900/10">
                <span className="text-xs text-brand-600 block font-medium">Pendapatan Bersih</span>
                <span className="text-2xl font-bold text-brand-700 dark:text-brand-400">{fmtRp(summary.netRevenue)}</span>
              </div>
            </div>
          )}

          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-gray-800 dark:text-white/90">Pendapatan per Bulan ({year})</h3>
              <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs dark:border-gray-700 dark:bg-gray-900 dark:text-white">
                {[2024, 2025, 2026, 2027].map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-800 text-xs font-semibold text-gray-400 uppercase">
                    <th className="py-2.5 px-4 text-left">Bulan</th>
                    <th className="py-2.5 px-4 text-right">Jumlah Booking</th>
                    <th className="py-2.5 px-4 text-right">Total Pendapatan</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyRevenue.map((row) => (
                    <tr key={row.month} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                      <td className="py-3 px-4 font-medium text-gray-800 dark:text-white/90">{monthNames[row.month - 1]}</td>
                      <td className="py-3 px-4 text-right text-gray-600 dark:text-gray-400">{row.bookingCount}</td>
                      <td className="py-3 px-4 text-right font-semibold text-gray-800 dark:text-white/90">{fmtRp(row.totalRevenue)}</td>
                    </tr>
                  ))}
                  {monthlyRevenue.length === 0 && (
                    <tr><td colSpan={3} className="py-6 text-center text-gray-400">Belum ada data pendapatan tahun ini.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Occupancy */}
      {!loading && tab === "occupancy" && (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <h3 className="font-semibold text-gray-800 dark:text-white/90 mb-4">Tingkat Hunian per Properti</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800 text-xs font-semibold text-gray-400 uppercase">
                  <th className="py-2.5 px-4 text-left">Properti</th>
                  <th className="py-2.5 px-4 text-right">Total Unit</th>
                  <th className="py-2.5 px-4 text-right">Malam Terisi</th>
                  <th className="py-2.5 px-4 text-right">Malam Tersedia</th>
                  <th className="py-2.5 px-4 text-right">Occupancy Rate</th>
                </tr>
              </thead>
              <tbody>
                {occupancyData.map((row) => (
                  <tr key={row.propertyId} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                    <td className="py-3 px-4 font-medium text-gray-800 dark:text-white/90">{row.propertyName}</td>
                    <td className="py-3 px-4 text-right text-gray-600 dark:text-gray-400">{row.totalUnits}</td>
                    <td className="py-3 px-4 text-right text-gray-600 dark:text-gray-400">{row.occupiedNights}</td>
                    <td className="py-3 px-4 text-right text-gray-600 dark:text-gray-400">{row.availableNights}</td>
                    <td className="py-3 px-4 text-right font-bold text-brand-600 dark:text-brand-400">
                      {(row.occupancyRate * 100).toFixed(1)}%
                    </td>
                  </tr>
                ))}
                {occupancyData.length === 0 && (
                  <tr><td colSpan={5} className="py-6 text-center text-gray-400">Belum ada data occupancy.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Transactions */}
      {!loading && tab === "transactions" && (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <h3 className="font-semibold text-gray-800 dark:text-white/90 mb-4">Riwayat Transaksi</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800 text-xs font-semibold text-gray-400 uppercase">
                  <th className="py-2.5 px-4 text-left">Kode Booking</th>
                  <th className="py-2.5 px-4 text-left">Tamu / Properti</th>
                  <th className="py-2.5 px-4 text-left">Metode</th>
                  <th className="py-2.5 px-4 text-left">Tanggal</th>
                  <th className="py-2.5 px-4 text-right">Nominal</th>
                  <th className="py-2.5 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {transactionsData.map((trx) => (
                  <tr key={trx.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                    <td className="py-3 px-4 font-mono font-medium text-brand-600 dark:text-brand-400">{trx.booking?.bookingCode}</td>
                    <td className="py-3 px-4">
                      <span className="font-medium text-gray-800 dark:text-white/90 block">{trx.booking?.guestName}</span>
                      <span className="text-xs text-gray-400">{trx.booking?.property?.name}</span>
                    </td>
                    <td className="py-3 px-4 text-gray-600 dark:text-gray-400">{trx.method}</td>
                    <td className="py-3 px-4 text-gray-600 dark:text-gray-400">{trx.paidAt ? fmtDate(trx.paidAt) : "-"}</td>
                    <td className="py-3 px-4 text-right font-semibold text-gray-800 dark:text-white/90">{fmtRp(trx.amount)}</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-0.5 text-xs rounded font-medium ${trx.status === "PAID" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}`}>
                        {trx.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {transactionsData.length === 0 && (
                  <tr><td colSpan={6} className="py-6 text-center text-gray-400">Belum ada transaksi.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
