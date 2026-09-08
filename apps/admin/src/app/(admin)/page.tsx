"use client";

import React, { useEffect, useState } from "react";
import { $api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

type DashboardData = {
  totalBookings: number;
  todayCheckIns: number;
  todayCheckOuts: number;
  revenue: string;
  pendingBookings: number;
  confirmedBookings: number;
};

type Property = {
  id: string;
  name: string;
  city: string;
  status: string;
};

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardData | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      $api.get<DashboardData>("/admin/dashboard/stats").catch(() => null),
      $api.get<Property[]>("/properties?limit=50").catch(() => []),
    ]).then(([s, p]) => {
      if (s) setStats(s);
      setProperties(Array.isArray(p) ? p : []);
      setLoading(false);
    });
  }, []);

  const fmtRp = (v: string | number) => "Rp" + Number(v).toLocaleString("id-ID");

  return (
    <div className="grid grid-cols-12 gap-4 md:gap-6">
      <div className="col-span-12">
        <h2 className="mb-1 text-xl font-semibold text-gray-800 dark:text-white/90">
          Selamat datang, {user?.name ?? "Staff"} 👋
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          Ringkasan operasional hari ini.
        </p>
      </div>

      {loading && (
        <div className="col-span-12 text-sm text-gray-400">Loading dashboard...</div>
      )}

      {stats && (
        <>
          <StatCard label="Total Bookings" value={String(stats.totalBookings)} />
          <StatCard label="Check-in Hari Ini" value={String(stats.todayCheckIns)} />
          <StatCard label="Check-out Hari Ini" value={String(stats.todayCheckOuts)} />
          <StatCard label="Pending" value={String(stats.pendingBookings)} accent />
          <StatCard label="Confirmed" value={String(stats.confirmedBookings)} />
          <StatCard label="Revenue (bulan ini)" value={fmtRp(stats.revenue ?? 0)} wide />
        </>
      )}

      {!stats && !loading && (
        <div className="col-span-12 rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Dashboard stats endpoint belum tersedia. Data booking bisa dilihat di menu <strong>Bookings</strong>.
          </p>
        </div>
      )}

      <div className="col-span-12">
        <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="p-5 border-b border-gray-200 dark:border-gray-800">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Properties</h3>
          </div>
          <div className="p-5">
            {properties.length === 0 && (
              <p className="text-sm text-gray-400">Belum ada property.</p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {properties.map((p) => (
                <div
                  key={p.id}
                  className="rounded-xl border border-gray-200 p-4 dark:border-gray-700"
                >
                  <h4 className="font-medium text-gray-800 dark:text-white/90">{p.name}</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{p.city}</p>
                  <span
                    className={`mt-2 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                      p.status === "ACTIVE"
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {p.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, accent, wide }: { label: string; value: string; accent?: boolean; wide?: boolean }) {
  return (
    <div className={`${wide ? "col-span-12 sm:col-span-6 lg:col-span-4" : "col-span-6 sm:col-span-4 lg:col-span-2"} rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]`}>
      <p className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400">{label}</p>
      <p className={`mt-1 text-xl font-bold ${accent ? "text-yellow-600" : "text-gray-800 dark:text-white/90"}`}>
        {value}
      </p>
    </div>
  );
}
