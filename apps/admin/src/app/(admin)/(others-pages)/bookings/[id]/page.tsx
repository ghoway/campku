"use client";

import React, { useEffect, useState, use } from "react";
import { $api } from "@/lib/api";
import Link from "next/link";
import { useRouter } from "next/navigation";

type BookingDetail = {
  id: string;
  bookingCode: string;
  property: { id: string; name: string };
  guestName: string;
  guestEmail: string;
  guestPhone: string | null;
  checkInDate: string;
  checkOutDate: string;
  adults: number;
  children: number;
  basePrice: string;
  discountAmount: string;
  grandTotal: string;
  status: string;
  paymentStatus: string;
  source: string;
  createdAt: string;
  bookingItems: Array<{
    id: string;
    unitType: { name: string };
    quantity: number;
    pricePerNight: string;
    subtotal: string;
  }>;
  payments: Array<{
    id: string;
    amount: string;
    method: string;
    status: string;
    paidAt: string | null;
  }>;
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

export default function BookingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [cashAmount, setCashAmount] = useState("");

  const loadData = () => {
    setLoading(true);
    $api
      .get<BookingDetail>(`/bookings/${resolvedParams.id}`)
      .then((res) => setBooking(res))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, [resolvedParams.id]);

  const handleCheckIn = async () => {
    if (!confirm("Proses Check-In untuk booking ini?")) return;
    setActionLoading(true);
    try {
      await $api.post(`/staff/bookings/${resolvedParams.id}/check-in`, {});
      alert("Berhasil Check-In!");
      loadData();
    } catch (e: any) {
      alert("Error: " + e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckOut = async () => {
    if (!confirm("Proses Check-Out untuk booking ini?")) return;
    setActionLoading(true);
    try {
      await $api.post(`/staff/bookings/${resolvedParams.id}/check-out`, {});
      alert("Berhasil Check-Out!");
      loadData();
    } catch (e: any) {
      alert("Error: " + e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm("Batalkan booking ini?")) return;
    setActionLoading(true);
    try {
      await $api.post(`/bookings/${resolvedParams.id}/cancel`, { reason: "Dibatalkan oleh staff" });
      alert("Booking dibatalkan.");
      loadData();
    } catch (e: any) {
      alert("Error: " + e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCashPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cashAmount || Number(cashAmount) <= 0) return;
    setActionLoading(true);
    try {
      await $api.post(`/bookings/${resolvedParams.id}/payments`, {
        amount: Number(cashAmount),
        paymentMethod: "CASH",
      });
      alert("Pembayaran tunai berhasil dicatat!");
      setCashAmount("");
      loadData();
    } catch (e: any) {
      alert("Error: " + e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const fmt = (d: string) => new Date(d).toISOString().slice(0, 10);
  const fmtRp = (v: string | number) => "Rp" + Number(v).toLocaleString("id-ID");

  if (loading) return <div className="p-5 text-gray-500">Loading detail booking...</div>;
  if (error || !booking) return <div className="p-5 text-red-600">Error: {error || "Not found"}</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/bookings" className="text-sm text-brand-500 hover:underline mb-1 inline-block">
            ← Kembali ke Bookings
          </Link>
          <h2 className="text-xl font-bold text-gray-800 dark:text-white/90">
            Booking #{booking.bookingCode}
          </h2>
        </div>
        <span className={`rounded-full px-3 py-1 text-sm font-semibold ${statusColors[booking.status] ?? "bg-gray-100"}`}>
          {booking.status}
        </span>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Info Tamu & Properti */}
        <div className="col-span-12 lg:col-span-8 space-y-6">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
            <h3 className="text-md font-semibold text-gray-800 dark:text-white/90 mb-4">Informasi Reservasi</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-400 block text-xs">Nama Tamu</span>
                <span className="font-medium text-gray-800 dark:text-white/90">{booking.guestName}</span>
              </div>
              <div>
                <span className="text-gray-400 block text-xs">Kontak</span>
                <span className="text-gray-700 dark:text-gray-300">{booking.guestEmail} {booking.guestPhone ? `(${booking.guestPhone})` : ""}</span>
              </div>
              <div>
                <span className="text-gray-400 block text-xs">Properti</span>
                <span className="font-medium text-gray-800 dark:text-white/90">{booking.property?.name}</span>
              </div>
              <div>
                <span className="text-gray-400 block text-xs">Tanggal Menginap</span>
                <span className="text-gray-700 dark:text-gray-300">{fmt(booking.checkInDate)} → {fmt(booking.checkOutDate)}</span>
              </div>
              <div>
                <span className="text-gray-400 block text-xs">Jumlah Tamu</span>
                <span className="text-gray-700 dark:text-gray-300">{booking.adults} Dewasa, {booking.children} Anak</span>
              </div>
              <div>
                <span className="text-gray-400 block text-xs">Sumber Booking</span>
                <span className="text-gray-700 dark:text-gray-300">{booking.source}</span>
              </div>
            </div>
          </div>

          {/* Items */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
            <h3 className="text-md font-semibold text-gray-800 dark:text-white/90 mb-4">Item & Unit Type</h3>
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {booking.bookingItems?.map((item) => (
                <div key={item.id} className="py-3 flex justify-between items-center text-sm">
                  <div>
                    <span className="font-medium text-gray-800 dark:text-white/90">{item.unitType?.name}</span>
                    <span className="text-gray-400 ml-2 text-xs">x{item.quantity} unit</span>
                  </div>
                  <div className="text-right">
                    <span className="text-gray-700 dark:text-gray-300">{fmtRp(item.subtotal)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Payments History */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
            <h3 className="text-md font-semibold text-gray-800 dark:text-white/90 mb-4">Riwayat Pembayaran</h3>
            {booking.payments?.length === 0 ? (
              <p className="text-sm text-gray-400">Belum ada catatan pembayaran.</p>
            ) : (
              <div className="space-y-2 text-sm">
                {booking.payments?.map((p) => (
                  <div key={p.id} className="flex justify-between items-center p-3 rounded-lg border border-gray-100 dark:border-gray-800">
                    <div>
                      <span className="font-medium text-gray-800 dark:text-white/90">{p.method}</span>
                      <span className="ml-2 text-xs text-gray-400">{p.paidAt ? fmt(p.paidAt) : "Pending"}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-gray-800 dark:text-white/90">{fmtRp(p.amount)}</span>
                      <span className={`px-2 py-0.5 text-xs rounded ${p.status === "PAID" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}`}>
                        {p.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Panel Aksi Operasional */}
        <div className="col-span-12 lg:col-span-4 space-y-6">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] space-y-4">
            <h3 className="text-md font-semibold text-gray-800 dark:text-white/90">Aksi Staff Operasional</h3>

            {/* Check-In / Check-Out Buttons */}
            {booking.status === "CONFIRMED" && (
              <button
                disabled={actionLoading}
                onClick={handleCheckIn}
                className="w-full rounded-xl bg-green-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
              >
                ✓ Process Check-In
              </button>
            )}

            {booking.status === "CHECKED_IN" && (
              <button
                disabled={actionLoading}
                onClick={handleCheckOut}
                className="w-full rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                ↑ Process Check-Out
              </button>
            )}

            {["PENDING", "AWAITING_PAYMENT", "CONFIRMED"].includes(booking.status) && (
              <button
                disabled={actionLoading}
                onClick={handleCancel}
                className="w-full rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-100 dark:border-red-900/30 dark:bg-red-900/10 disabled:opacity-50"
              >
                ✕ Batalkan Booking
              </button>
            )}
          </div>

          {/* Form Bayar Tunai (Cash Payment) */}
          {["PENDING", "AWAITING_PAYMENT"].includes(booking.status) && (
            <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
              <h3 className="text-md font-semibold text-gray-800 dark:text-white/90 mb-3">Terima Pembayaran Cash</h3>
              <form onSubmit={handleCashPayment} className="space-y-3">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Nominal Cash (Rp)</label>
                  <input
                    type="number"
                    placeholder={booking.grandTotal}
                    value={cashAmount}
                    onChange={(e) => setCashAmount(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                  />
                </div>
                <button
                  type="submit"
                  disabled={actionLoading || !cashAmount}
                  className="w-full rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50"
                >
                  Simpan Pembayaran Cash
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
