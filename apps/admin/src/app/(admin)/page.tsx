"use client";

import React, { useEffect, useState } from "react";
import { $api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";

type UpcomingReservation = {
  id: string;
  bookingCode: string;
  guestName: string;
  property: { id: string; name: string };
  checkIn: string;
  checkOut: string;
  grandTotal: string;
};

type DashboardData = {
  todayReservations: number;
  todayRevenue: string;
  todayCheckIns: number;
  todayCheckOuts: number;
  occupancyRate: number;
  monthlyRevenue: string;
  activeProperties: number;
  activeStaff: number;
  upcomingReservations: UpcomingReservation[];
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
    const load = async () => {
      try {
        const [s, p] = await Promise.all([
          $api.get<DashboardData>("/admin/dashboard").catch(() => null),
          $api.get<Property[]>("/properties?limit=50").catch(() => null),
        ]);
        if (s) setStats(s);
        if (p) setProperties(Array.isArray(p) ? p : []);
      } catch (e) {
        console.error("Dashboard load error:", e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const fmtRp = (v: string | number) => "Rp" + Number(v).toLocaleString("id-ID");
  const fmtDate = (d: string) => new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });

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
          <StatCard label="Reservasi Hari Ini" value={String(stats.todayReservations)} />
          <StatCard label="Check-in Hari Ini" value={String(stats.todayCheckIns)} />
          <StatCard label="Check-out Hari Ini" value={String(stats.todayCheckOuts)} />
          <StatCard label="Okupansi" value={`${stats.occupancyRate}%`} accent />
          <StatCard label="Pendapatan Hari Ini" value={fmtRp(stats.todayRevenue)} />
          <StatCard label="Pendapatan Bulan Ini" value={fmtRp(stats.monthlyRevenue)} wide />
          <StatCard label="Properti Aktif" value={String(stats.activeProperties)} />
          <StatCard label="Staff Aktif" value={String(stats.activeStaff)} />
        </>
      )}

      {!loading && !stats && (
        <div className="col-span-12 rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
          <p className="text-sm text-gray-500">
            Dashboard stats belum tersedia. Pastikan backend running di <code>localhost:8080</code> dan endpoint <code>/admin/dashboard</code> accessible. Data booking bisa dilihat di menu <strong>Bookings</strong>.
          </p>
        </div>
      )}

      {/* Upcoming Reservations */}
      {stats && stats.upcomingReservations?.length > 0 && (
        <div className="col-span-12 lg:col-span-7">
          <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
            <div className="p-5 border-b border-gray-200 dark:border-gray-800">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Check-in Mendatang (7 hari)</h3>
            </div>
            <div className="p-5 space-y-3">
              {stats.upcomingReservations.map((r) => (
                <Link
                  key={r.id}
                  href={`/bookings/${r.id}`}
                  className="flex justify-between items-center p-3 rounded-lg border border-gray-100 hover:border-brand-200 dark:border-gray-800 dark:hover:border-brand-900/30 transition-colors"
                >
                  <div>
                    <span className="font-medium text-gray-800 dark:text-white/90">{r.bookingCode}</span>
                    <span className="text-gray-400 text-xs ml-2">{r.guestName}</span>
                    <span className="block text-xs text-gray-400">{r.property.name} · Check-in {fmtDate(r.checkIn)}</span>
                  </div>
                  <span className="font-semibold text-brand-600 text-sm">{fmtRp(r.grandTotal)}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Properties */}
      <div className={`col-span-12 ${stats && stats.upcomingReservations?.length > 0 ? "lg:col-span-5" : ""}`}>
        <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="p-5 border-b border-gray-200 dark:border-gray-800">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Properties</h3>
          </div>
          <div className="p-5">
            {properties.length === 0 && (
              <p className="text-sm text-gray-400">Belum ada property.</p>
            )}
            <div className="space-y-3">
              {properties.map((p) => (
                <div key={p.id} className="rounded-xl border border-gray-200 p-4 dark:border-gray-700">
                  <h4 className="font-medium text-gray-800 dark:text-white/90">{p.name}</h4>
                  <p className="text-sm text-gray-500">{p.city}</p>
                  <span className={`mt-2 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${p.status === "ACTIVE" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-500"}`}>
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
