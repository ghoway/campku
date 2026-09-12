"use client";

import React, { useState } from "react";
import { $api } from "@/lib/api";
import Link from "next/link";

type Unit = { id: string; code: string; name: string | null; status: string };
type BookingItemUnit = { id: string; unit: Unit; allocatedAt: string };
type BookingItem = {
  id: string;
  unitTypeId: string;
  unitTypeNameSnapshot: string;
  quantity: number;
  subtotal: string;
  units: BookingItemUnit[];
};
type BookingResult = {
  id: string;
  bookingCode: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string | null;
  checkInDate: string;
  checkOutDate: string;
  adults: number;
  children: number;
  grandTotal: string;
  paidAmount: string;
  remaining: string;
  status: string;
  source: string;
  property: { id: string; name: string };
  items: BookingItem[];
};

const statusColors: Record<string, string> = {
  PENDING: "bg-gray-100 text-gray-700",
  AWAITING_PAYMENT: "bg-yellow-100 text-yellow-800",
  CONFIRMED: "bg-green-100 text-green-800",
  CHECKED_IN: "bg-blue-100 text-blue-800",
  CHECKED_OUT: "bg-gray-100 text-gray-500",
  CANCELLED: "bg-red-100 text-red-700",
};

const fmt = (d: string) => new Date(d).toISOString().slice(0, 10);
const fmtRp = (v: string | number) => "Rp" + Number(v).toLocaleString("id-ID");

export default function FastCheckInPage() {
  const [code, setCode] = useState("");
  const [booking, setBooking] = useState<BookingResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionSuccess, setActionSuccess] = useState("");

  const searchBooking = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = code.trim();
    if (!clean) return;
    setLoading(true);
    setError("");
    setActionSuccess("");
    setBooking(null);

    try {
      // Find booking by code via staff search
      const res = await $api.getList<any>(`/staff/bookings?bookingCode=${encodeURIComponent(clean)}&limit=1`);
      if (!res.data || res.data.length === 0) {
        setError(`Booking dengan kode "${clean}" tidak ditemukan.`);
        return;
      }
      // Get full detail with items & allocations
      const full = await $api.get<BookingResult>(`/bookings/${res.data[0].id}`);
      setBooking(full);
    } catch (err: any) {
      setError(err.message || "Gagal mencari booking");
    } finally {
      setLoading(false);
    }
  };

  const reloadBooking = async () => {
    if (!booking) return;
    try {
      const full = await $api.get<BookingResult>(`/bookings/${booking.id}`);
      setBooking(full);
    } catch { /* ignore */ }
  };

  const handleCheckIn = async () => {
    if (!booking) return;
    if (!confirm(`Proses Check-In untuk tamu ${booking.guestName}?`)) return;
    setActionLoading(true);
    try {
      await $api.post(`/staff/bookings/${booking.id}/check-in`, {});
      setActionSuccess("Check-in berhasil!");
      reloadBooking();
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckOut = async () => {
    if (!booking) return;
    if (!confirm(`Proses Check-Out untuk tamu ${booking.guestName}?`)) return;
    setActionLoading(true);
    try {
      await $api.post(`/staff/bookings/${booking.id}/check-out`, {});
      setActionSuccess("Check-out berhasil!");
      reloadBooking();
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h2 className="text-xl font-bold text-gray-800 dark:text-white/90">
          Cek & Validasi Booking Tamu
        </h2>
        <p className="text-sm text-gray-500 mt-0.5">
          Cari berdasarkan kode booking customer untuk validasi cepat dan proses check-in / check-out.
        </p>
      </div>

      {/* Search Bar */}
      <form onSubmit={searchBooking} className="flex gap-3">
        <input
          type="text"
          placeholder="Masukkan kode booking (misal: SEED-0001)..."
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          className="flex-1 h-12 rounded-xl border border-gray-300 bg-white px-4 text-base font-mono uppercase text-gray-800 placeholder:text-gray-400 focus:border-brand-500 focus:outline-hidden focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
          autoFocus
        />
        <button
          type="submit"
          disabled={loading || !code.trim()}
          className="h-12 px-6 rounded-xl bg-brand-500 text-white font-semibold hover:bg-brand-600 disabled:opacity-50 transition-colors"
        >
          {loading ? "Mencari..." : "Cari Booking"}
        </button>
      </form>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 text-red-700 border border-red-200 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      {actionSuccess && (
        <div className="p-4 rounded-xl bg-green-50 text-green-700 border border-green-200 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400 text-sm">
          ✓ {actionSuccess}
        </div>
      )}

      {/* Booking Card */}
      {booking && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03] space-y-5">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-mono text-gray-400">KODE BOOKING</span>
              <h3 className="text-2xl font-bold font-mono text-brand-600 dark:text-brand-400">
                {booking.bookingCode}
              </h3>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusColors[booking.status] ?? "bg-gray-100"}`}>
              {booking.status}
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm border-t border-b border-gray-100 dark:border-gray-800 py-4">
            <div>
              <span className="text-xs text-gray-400 block">Nama Tamu</span>
              <span className="font-semibold text-gray-800 dark:text-white/90">{booking.guestName}</span>
            </div>
            <div>
              <span className="text-xs text-gray-400 block">No. Telepon</span>
              <span className="text-gray-700 dark:text-gray-300">{booking.guestPhone || "-"}</span>
            </div>
            <div>
              <span className="text-xs text-gray-400 block">Properti</span>
              <span className="font-semibold text-gray-800 dark:text-white/90">{booking.property?.name}</span>
            </div>
            <div>
              <span className="text-xs text-gray-400 block">Tanggal Menginap</span>
              <span className="text-gray-700 dark:text-gray-300">
                {fmt(booking.checkInDate)} → {fmt(booking.checkOutDate)}
              </span>
            </div>
            <div>
              <span className="text-xs text-gray-400 block">Jumlah Tamu</span>
              <span className="text-gray-700 dark:text-gray-300">{booking.adults} Dewasa, {booking.children} Anak</span>
            </div>
            <div>
              <span className="text-xs text-gray-400 block">Total Biaya</span>
              <span className="font-bold text-gray-800 dark:text-white/90">{fmtRp(booking.grandTotal)}</span>
            </div>
            <div>
              <span className="text-xs text-gray-400 block">Status Pembayaran</span>
              <span className={`font-semibold ${Number(booking.remaining) === 0 ? "text-green-600" : "text-orange-600"}`}>
                {Number(booking.remaining) === 0 ? "✓ Lunas" : `Kurang ${fmtRp(booking.remaining)}`}
              </span>
            </div>
            <div>
              <span className="text-xs text-gray-400 block">Sumber</span>
              <span className="text-gray-700 dark:text-gray-300">{booking.source}</span>
            </div>
          </div>

          {/* Unit Items */}
          <div>
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-2">
              Unit yang Dipesan
            </span>
            <div className="space-y-2">
              {booking.items?.map((item) => (
                <div key={item.id} className="flex justify-between items-center p-3 rounded-xl bg-gray-50 dark:bg-gray-800/40 text-sm">
                  <div>
                    <span className="font-medium text-gray-800 dark:text-white/90">
                      {item.unitTypeNameSnapshot}
                    </span>
                    <span className="text-xs text-gray-400 ml-2">x{item.quantity} unit</span>
                  </div>
                  <div className="flex gap-1.5">
                    {item.units?.length > 0 ? (
                      item.units.map((bu) => (
                        <span key={bu.id} className="rounded-md bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 px-2 py-0.5 text-xs font-semibold">
                          🏕 {bu.unit.code}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-orange-500">Belum ada tenda dialokasikan</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            {booking.status === "CONFIRMED" && (
              <button
                disabled={actionLoading}
                onClick={handleCheckIn}
                className="flex-1 h-12 rounded-xl bg-green-600 text-white font-bold hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                {actionLoading ? "Memproses..." : "✓ Proses Check-In Sekarang"}
              </button>
            )}

            {booking.status === "CHECKED_IN" && (
              <button
                disabled={actionLoading}
                onClick={handleCheckOut}
                className="flex-1 h-12 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {actionLoading ? "Memproses..." : "↑ Proses Check-Out Sekarang"}
              </button>
            )}

            <Link
              href={`/bookings/${booking.id}`}
              className="px-5 h-12 rounded-xl border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center justify-center text-sm"
            >
              Lihat Detail Lengkap →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
