"use client";

import React, { useEffect, useState } from "react";
import { $api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

type Shift = {
  id: string;
  status: string;
  startTime: string;
  endTime: string | null;
  startCash: string;
  endCash: string | null;
  staff: { name: string };
};

type ShiftReport = {
  shiftInfo: {
    id: string;
    startTime: string;
    endTime: string | null;
    status: string;
    staffName: string;
  };
  financial: {
    startCash: string;
    cashPaymentsReceived: string;
    expectedEndCash: string;
    actualEndCash: string | null;
    cashDifference: string;
  };
  transactions: {
    totalCashPayments: number;
  };
};

export default function ShiftsPage() {
  const { user } = useAuth();
  const [currentShift, setCurrentShift] = useState<Shift | null>(null);
  const [report, setReport] = useState<ShiftReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [startCash, setStartCash] = useState("");
  const [endCash, setEndCash] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const loadCurrentShift = () => {
    setLoading(true);
    $api
      .get<{ data: Shift }>("/staff/shifts/current")
      .then((res) => {
        setCurrentShift(res.data);
        if (res.data) {
          loadReport(res.data.id);
        }
      })
      .catch((e) => {
        if (e.message.includes("NOT_FOUND")) {
          setCurrentShift(null); // No active shift
        } else {
          setError(e.message);
        }
      })
      .finally(() => setLoading(false));
  };

  const loadReport = (shiftId: string) => {
    $api
      .get<{ data: ShiftReport }>(`/staff/shifts/${shiftId}/report`)
      .then((res) => setReport(res.data))
      .catch(console.error);
  };

  useEffect(() => {
    loadCurrentShift();
  }, []);

  const handleOpenShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startCash) return;
    setActionLoading(true);
    try {
      await $api.post("/staff/shifts/open", { startCash: Number(startCash) });
      alert("Shift berhasil dibuka!");
      setStartCash("");
      loadCurrentShift();
    } catch (e: any) {
      alert("Error: " + e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCloseShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentShift || !endCash) return;
    if (!confirm("Tutup shift sekarang?")) return;
    setActionLoading(true);
    try {
      await $api.post(`/staff/shifts/${currentShift.id}/close`, { endCash: Number(endCash) });
      alert("Shift berhasil ditutup!");
      setEndCash("");
      setReport(null);
      loadCurrentShift();
    } catch (e: any) {
      alert("Error: " + e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const fmtTime = (d: string) => new Date(d).toLocaleString("id-ID");
  const fmtRp = (v: string | number) => "Rp" + Number(v).toLocaleString("id-ID");

  if (loading) return <div className="p-5 text-gray-500">Loading shift data...</div>;

  return (
    <div className="grid grid-cols-12 gap-6">
      <div className="col-span-12">
        <h2 className="text-xl font-bold text-gray-800 dark:text-white/90">Staff Shift Management</h2>
        <p className="text-sm text-gray-500">Manajemen buka/tutup kasir dan laporan shift tunai.</p>
      </div>

      {!currentShift ? (
        // Buka Shift
        <div className="col-span-12 md:col-span-6 lg:col-span-5">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
            <div className="mb-6 flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 text-red-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
              </span>
              <div>
                <h3 className="font-semibold text-gray-800 dark:text-white/90">Shift Saat Ini Ditutup</h3>
                <p className="text-xs text-gray-500">Anda belum membuka shift kasir.</p>
              </div>
            </div>

            <form onSubmit={handleOpenShift} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Saldo Awal Kasir (Start Cash)</label>
                <div className="mt-1 relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">Rp</span>
                  <input
                    type="number"
                    min="0"
                    required
                    value={startCash}
                    onChange={(e) => setStartCash(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 pl-10 pr-4 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                    placeholder="0"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={actionLoading || !startCash}
                className="w-full rounded-xl bg-brand-500 px-4 py-2.5 font-semibold text-white hover:bg-brand-600 disabled:opacity-50"
              >
                Buka Shift Sekarang
              </button>
            </form>
          </div>
        </div>
      ) : (
        // Shift Aktif
        <>
          <div className="col-span-12 md:col-span-6">
            <div className="rounded-2xl border border-brand-200 bg-brand-50/30 p-6 dark:border-brand-900/30 dark:bg-brand-900/10">
              <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 text-green-600">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" /></svg>
                  </span>
                  <div>
                    <h3 className="font-semibold text-brand-800 dark:text-brand-300">Shift Kasir Aktif</h3>
                    <p className="text-xs text-brand-600/70 dark:text-brand-400/70">Staff: {currentShift.staff?.name}</p>
                  </div>
                </div>
                <span className="animate-pulse rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-800">
                  OPEN
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm mb-6">
                <div>
                  <span className="block text-xs text-brand-600/70 dark:text-brand-400/70">Mulai Shift</span>
                  <span className="font-medium text-brand-900 dark:text-brand-100">{fmtTime(currentShift.startTime)}</span>
                </div>
                <div>
                  <span className="block text-xs text-brand-600/70 dark:text-brand-400/70">Kasir Awal</span>
                  <span className="font-medium text-brand-900 dark:text-brand-100">{fmtRp(currentShift.startCash)}</span>
                </div>
              </div>

              <div className="pt-4 border-t border-brand-200/50 dark:border-brand-800/50">
                <form onSubmit={handleCloseShift} className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-brand-800 dark:text-brand-300">Saldo Akhir Aktual Kasir (End Cash)</label>
                    <div className="mt-1 relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-500">Rp</span>
                      <input
                        type="number"
                        min="0"
                        required
                        value={endCash}
                        onChange={(e) => setEndCash(e.target.value)}
                        className="w-full rounded-xl border border-brand-300 pl-10 pr-4 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-brand-700 dark:bg-brand-900/20 dark:text-white"
                        placeholder="0"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={actionLoading || !endCash}
                    className="w-full rounded-xl bg-red-600 px-4 py-2.5 font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                  >
                    Tutup Shift
                  </button>
                </form>
              </div>
            </div>
          </div>

          <div className="col-span-12 md:col-span-6">
            {report ? (
              <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
                <h3 className="font-semibold text-gray-800 dark:text-white/90 mb-4">Live Shift Report</h3>
                
                <div className="space-y-4">
                  <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-800 text-sm">
                    <span className="text-gray-500">Saldo Awal</span>
                    <span className="font-medium text-gray-800 dark:text-white/90">{fmtRp(report.financial.startCash)}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-800 text-sm">
                    <span className="text-gray-500">Pemasukan Tunai Hari Ini ({report.transactions.totalCashPayments} trx)</span>
                    <span className="font-medium text-green-600">+{fmtRp(report.financial.cashPaymentsReceived)}</span>
                  </div>
                  <div className="flex justify-between items-center py-3 bg-gray-50 dark:bg-gray-800/50 px-3 rounded-lg text-sm mt-4">
                    <span className="font-medium text-gray-700 dark:text-gray-300">Ekspektasi Uang Fisik (Sistem)</span>
                    <span className="font-bold text-gray-900 dark:text-white text-base">{fmtRp(report.financial.expectedEndCash)}</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-2">
                    Harap pastikan jumlah uang fisik di kasir sesuai dengan nilai ekspektasi sistem sebelum menutup shift.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex h-full items-center justify-center rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
                <p className="text-sm text-gray-400">Loading live report...</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
