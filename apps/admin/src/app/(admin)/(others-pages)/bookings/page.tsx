"use client";

import React, { useEffect, useState } from "react";
import { $api } from "@/lib/api";
import Link from "next/link";

type Booking = {
  id: string;
  bookingCode: string;
  property: { name: string };
  guestName: string;
  guestPhone: string | null;
  checkInDate: string;
  checkOutDate: string;
  adults: number;
  children: number;
  grandTotal: string;
  status: string;
  source: string;
};

const statusColors: Record<string, string> = {
  PENDING: "bg-gray-100 text-gray-700",
  AWAITING_PAYMENT: "bg-yellow-100 text-yellow-800",
  CONFIRMED: "bg-green-100 text-green-800",
  CHECKED_IN: "bg-blue-100 text-blue-800",
  CHECKED_OUT: "bg-gray-100 text-gray-500",
  CANCELLED: "bg-red-100 text-red-700",
  EXPIRED: "bg-gray-100 text-gray-500",
  NO_SHOW: "bg-orange-100 text-orange-700",
};

const fmt = (d: string) => new Date(d).toISOString().slice(0, 10);
const fmtRp = (v: string | number) =>
  "Rp" + Number(v).toLocaleString("id-ID");

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<{ total: number; totalPages: number } | null>(null);

  useEffect(() => {
    setLoading(true);
    const qs = new URLSearchParams();
    if (statusFilter) qs.set("status", statusFilter);
    if (search) qs.set("bookingCode", search);
    qs.set("page", String(page));
    qs.set("limit", "15");

    $api
      .getList<Booking>(`/staff/bookings?${qs.toString()}`)
      .then((res) => {
        setBookings(res.data);
        setMeta(res.meta);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [statusFilter, search, page]);

  return (
    <div className="grid grid-cols-12 gap-4 md:gap-6">
      <div className="col-span-12">
        <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="p-5 border-b border-gray-200 dark:border-gray-800 flex flex-wrap items-center gap-3 justify-between">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Bookings</h3>
            <div className="flex flex-wrap items-center gap-3">
              <input
                type="text"
                placeholder="Cari kode booking..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="h-10 rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              />
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="h-10 rounded-lg border border-gray-300 bg-transparent px-3 py-2.5 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              >
                <option value="">Semua status</option>
                <option value="PENDING">PENDING</option>
                <option value="AWAITING_PAYMENT">AWAITING_PAYMENT</option>
                <option value="CONFIRMED">CONFIRMED</option>
                <option value="CHECKED_IN">CHECKED_IN</option>
                <option value="CHECKED_OUT">CHECKED_OUT</option>
                <option value="CANCELLED">CANCELLED</option>
                <option value="EXPIRED">EXPIRED</option>
                <option value="NO_SHOW">NO_SHOW</option>
              </select>
            </div>
          </div>

          <div className="p-5">
            {error && <p className="text-sm text-red-600">{error}</p>}
            {loading && <p className="text-sm text-gray-500">Loading...</p>}
            {!loading && !error && (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[920px]">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-800">
                      <th className="py-3 px-4 text-left text-xs font-semibold uppercase text-gray-500">Kode</th>
                      <th className="py-3 px-4 text-left text-xs font-semibold uppercase text-gray-500">Properti</th>
                      <th className="py-3 px-4 text-left text-xs font-semibold uppercase text-gray-500">Tamu</th>
                      <th className="py-3 px-4 text-left text-xs font-semibold uppercase text-gray-500">Tanggal</th>
                      <th className="py-3 px-4 text-left text-xs font-semibold uppercase text-gray-500">Total</th>
                      <th className="py-3 px-4 text-left text-xs font-semibold uppercase text-gray-500">Status</th>
                      <th className="py-3 px-4 text-left text-xs font-semibold uppercase text-gray-500">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(bookings || []).map((b) => (
                      <tr key={b.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                        <td className="py-3 px-4 text-sm font-medium text-gray-800 dark:text-white/90">{b.bookingCode}</td>
                        <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-400">{b.property?.name}</td>
                        <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-400">
                          {b.guestName}
                          <br />
                          <span className="text-xs text-gray-400">{b.guestPhone ?? "-"}</span>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-400">
                          {fmt(b.checkInDate)} → {fmt(b.checkOutDate)}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-400">{fmtRp(b.grandTotal)}</td>
                        <td className="py-3 px-4">
                          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[b.status] ?? "bg-gray-100 text-gray-600"}`}>
                            {b.status}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <Link
                            href={`/bookings/${b.id}`}
                            className="text-sm font-medium text-brand-500 hover:text-brand-600"
                          >
                            Detail
                          </Link>
                        </td>
                      </tr>
                    ))}
                    {!bookings.length && (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-sm text-gray-400">
                          Tidak ada booking.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {meta && meta.totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <span className="text-sm text-gray-500">
                  Halaman {page} dari {meta.totalPages} ({meta.total} booking)
                </span>
                <div className="flex gap-2">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage(page - 1)}
                    className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-40 dark:border-gray-700 dark:text-gray-300"
                  >
                    ← Prev
                  </button>
                  <button
                    disabled={page >= meta.totalPages}
                    onClick={() => setPage(page + 1)}
                    className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-40 dark:border-gray-700 dark:text-gray-300"
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
