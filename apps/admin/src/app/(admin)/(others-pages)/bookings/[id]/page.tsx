"use client";

import React, { useEffect, useState, use } from "react";
import { $api } from "@/lib/api";
import Link from "next/link";

const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e));

type Unit = { id: string; code: string; name: string | null; status: string };
type BookingItemUnit = { id: string; unit: Unit; allocatedAt: string };
type BookingItem = {
  id: string;
  unitTypeId: string;
  unitType: { id: string; name: string };
  unitTypeNameSnapshot: string;
  quantity: number;
  subtotal: string;
  nights: Array<{ stayDate: string; unitPrice: string; total: string; rateName: string }>;
  units: BookingItemUnit[];
};
type Payment = { id: string; amount: string; method: string; status: string; paidAt: string | null };
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
  subtotal: string;
  discount: string;
  additionalFee: string;
  grandTotal: string;
  paidAmount: string;
  remaining: string;
  status: string;
  source: string;
  createdAt: string;
  checkedInAt: string | null;
  checkedOutAt: string | null;
  items: BookingItem[];
  payments: Payment[];
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
const fmtRp = (v: string | number) => "Rp" + Number(v).toLocaleString("id-ID");

export default function BookingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [cashAmount, setCashAmount] = useState("");

  // Unit allocation state
  const [allocModalItem, setAllocModalItem] = useState<BookingItem | null>(null);
  const [availableUnits, setAvailableUnits] = useState<Unit[]>([]);
  const [selectedUnitIds, setSelectedUnitIds] = useState<string[]>([]);
  const [allocLoading, setAllocLoading] = useState(false);

  const loadData = () => {
    setLoading(true);
    $api
      .get<BookingDetail>(`/bookings/${resolvedParams.id}`)
      .then((res) => setBooking(res))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, [resolvedParams.id]);

  const doAction = async (fn: () => Promise<void>, msg: string) => {
    setActionLoading(true);
    try { await fn(); alert(msg); loadData(); }
    catch (e) { alert("Error: " + errMsg(e)); }
    finally { setActionLoading(false); }
  };

  const handleCheckIn = () => {
    if (!confirm("Proses Check-In untuk booking ini?")) return;
    doAction(() => $api.post(`/staff/bookings/${resolvedParams.id}/check-in`, {}), "Berhasil Check-In!");
  };
  const handleCheckOut = () => {
    if (!confirm("Proses Check-Out untuk booking ini?")) return;
    doAction(() => $api.post(`/staff/bookings/${resolvedParams.id}/check-out`, {}), "Berhasil Check-Out!");
  };
  const handleCancel = () => {
    if (!confirm("Batalkan booking ini?")) return;
    doAction(() => $api.post(`/bookings/${resolvedParams.id}/cancel`, { reason: "Dibatalkan oleh staff" }), "Booking dibatalkan.");
  };
  const handleCashPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cashAmount || Number(cashAmount) <= 0) return;
    doAction(async () => {
      await $api.post(`/bookings/${resolvedParams.id}/payments`, { amount: Number(cashAmount), paymentMethod: "CASH" });
      setCashAmount("");
    }, "Pembayaran tunai berhasil dicatat!");
  };

  // Open unit allocation modal for a booking item
  const openAllocModal = async (item: BookingItem) => {
    setAllocModalItem(item);
    setSelectedUnitIds(item.units.map((u) => u.unit.id));
    try {
      // Fetch available units for this unit type (staff-safe endpoint)
      const units = await $api.get<Unit[]>(`/staff/unit-types/${item.unitTypeId}/units`);
      setAvailableUnits((units || []).filter((u) => u.status === "AVAILABLE"));
    } catch {
      setAvailableUnits([]);
    }
  };

  const toggleUnit = (unitId: string) => {
    setSelectedUnitIds((prev) =>
      prev.includes(unitId) ? prev.filter((id) => id !== unitId) : [...prev, unitId]
    );
  };

  const saveAllocation = async () => {
    if (!allocModalItem || !booking) return;
    if (selectedUnitIds.length !== allocModalItem.quantity) {
      alert(`Pilih tepat ${allocModalItem.quantity} unit untuk ${allocModalItem.unitType.name}`);
      return;
    }
    setAllocLoading(true);
    try {
      await $api.put(`/staff/bookings/${booking.id}/unit-allocation`, {
        allocations: [{ bookingItemId: allocModalItem.id, unitIds: selectedUnitIds }],
      });
      alert("Unit berhasil dialokasikan!");
      setAllocModalItem(null);
      loadData();
    } catch (e) {
      alert("Error: " + errMsg(e));
    } finally {
      setAllocLoading(false);
    }
  };

  if (loading) return <div className="p-5 text-gray-500">Loading detail booking...</div>;
  if (error || !booking) return <div className="p-5 text-red-600">Error: {error || "Not found"}</div>;

  const canAllocate = ["CONFIRMED", "CHECKED_IN"].includes(booking.status);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/bookings" className="text-sm text-brand-500 hover:underline mb-1 inline-block">← Kembali ke Bookings</Link>
          <h2 className="text-xl font-bold text-gray-800 dark:text-white/90">Booking #{booking.bookingCode}</h2>
        </div>
        <span className={`rounded-full px-3 py-1 text-sm font-semibold ${statusColors[booking.status] ?? "bg-gray-100"}`}>{booking.status}</span>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Left: Info */}
        <div className="col-span-12 lg:col-span-8 space-y-6">
          {/* Guest & Property Info */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
            <h3 className="text-md font-semibold text-gray-800 dark:text-white/90 mb-4">Informasi Reservasi</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-gray-400 block text-xs">Nama Tamu</span><span className="font-medium text-gray-800 dark:text-white/90">{booking.guestName}</span></div>
              <div><span className="text-gray-400 block text-xs">Kontak</span><span className="text-gray-700 dark:text-gray-300">{booking.guestEmail} {booking.guestPhone ? `(${booking.guestPhone})` : ""}</span></div>
              <div><span className="text-gray-400 block text-xs">Properti</span><span className="font-medium text-gray-800 dark:text-white/90">{booking.property?.name}</span></div>
              <div><span className="text-gray-400 block text-xs">Tanggal Menginap</span><span className="text-gray-700 dark:text-gray-300">{fmt(booking.checkInDate)} → {fmt(booking.checkOutDate)}</span></div>
              <div><span className="text-gray-400 block text-xs">Jumlah Tamu</span><span className="text-gray-700 dark:text-gray-300">{booking.adults} Dewasa, {booking.children} Anak</span></div>
              <div><span className="text-gray-400 block text-xs">Sumber</span><span className="text-gray-700 dark:text-gray-300">{booking.source}</span></div>
              {booking.checkedInAt && <div><span className="text-gray-400 block text-xs">Checked In</span><span className="text-gray-700 dark:text-gray-300">{new Date(booking.checkedInAt).toLocaleString("id-ID")}</span></div>}
              {booking.checkedOutAt && <div><span className="text-gray-400 block text-xs">Checked Out</span><span className="text-gray-700 dark:text-gray-300">{new Date(booking.checkedOutAt).toLocaleString("id-ID")}</span></div>}
            </div>
          </div>

          {/* Items + Unit Allocation */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
            <h3 className="text-md font-semibold text-gray-800 dark:text-white/90 mb-4">Item & Alokasi Unit</h3>
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {(booking.items || []).map((item) => (
                <div key={item.id} className="py-3">
                  <div className="flex justify-between items-center text-sm">
                    <div>
                      <span className="font-medium text-gray-800 dark:text-white/90">{item.unitType?.name || item.unitTypeNameSnapshot}</span>
                      <span className="text-gray-400 ml-2 text-xs">x{item.quantity} unit</span>
                    </div>
                    <span className="text-gray-700 dark:text-gray-300">{fmtRp(item.subtotal)}</span>
                  </div>
                  {/* Allocated units */}
                  <div className="mt-2 flex flex-wrap gap-2 items-center">
                    {item.units?.length > 0 ? (
                      item.units.map((bu) => (
                        <span key={bu.id} className="inline-flex items-center gap-1 rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 border border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800">
                          🏕 {bu.unit.code}{bu.unit.name ? ` (${bu.unit.name})` : ""}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-orange-500">⚠ Belum ada unit dialokasikan</span>
                    )}
                    {canAllocate && (
                      <button
                        onClick={() => openAllocModal(item)}
                        className="text-xs text-brand-500 hover:text-brand-600 font-medium ml-1"
                      >
                        {item.units?.length > 0 ? "✏ Ubah" : "➕ Alokasi Unit"}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Payment Summary */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
            <h3 className="text-md font-semibold text-gray-800 dark:text-white/90 mb-4">Ringkasan Pembayaran</h3>
            <div className="grid grid-cols-3 gap-3 text-sm mb-4">
              <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                <span className="text-gray-400 block text-xs">Grand Total</span>
                <span className="font-bold text-gray-800 dark:text-white/90">{fmtRp(booking.grandTotal)}</span>
              </div>
              <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20">
                <span className="text-gray-400 block text-xs">Terbayar</span>
                <span className="font-bold text-green-700 dark:text-green-400">{fmtRp(booking.paidAmount)}</span>
              </div>
              <div className="p-3 rounded-lg bg-orange-50 dark:bg-orange-900/20">
                <span className="text-gray-400 block text-xs">Sisa</span>
                <span className="font-bold text-orange-700 dark:text-orange-400">{fmtRp(booking.remaining)}</span>
              </div>
            </div>
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
                      <span className={`px-2 py-0.5 text-xs rounded ${p.status === "PAID" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}`}>{p.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Actions */}
        <div className="col-span-12 lg:col-span-4 space-y-6">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] space-y-4">
            <h3 className="text-md font-semibold text-gray-800 dark:text-white/90">Aksi Staff</h3>
            {booking.status === "CONFIRMED" && (
              <button disabled={actionLoading} onClick={handleCheckIn} className="w-full rounded-xl bg-green-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50">✓ Check-In</button>
            )}
            {booking.status === "CHECKED_IN" && (
              <button disabled={actionLoading} onClick={handleCheckOut} className="w-full rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">↑ Check-Out</button>
            )}
            {["PENDING", "AWAITING_PAYMENT", "CONFIRMED"].includes(booking.status) && (
              <button disabled={actionLoading} onClick={handleCancel} className="w-full rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-100 dark:border-red-900/30 dark:bg-red-900/10 disabled:opacity-50">✕ Batalkan Booking</button>
            )}
          </div>

          {["PENDING", "AWAITING_PAYMENT"].includes(booking.status) && (
            <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
              <h3 className="text-md font-semibold text-gray-800 dark:text-white/90 mb-3">Terima Pembayaran Cash</h3>
              <form onSubmit={handleCashPayment} className="space-y-3">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Nominal Cash (Rp)</label>
                  <input type="number" placeholder={booking.grandTotal} value={cashAmount} onChange={(e) => setCashAmount(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white" />
                </div>
                <button type="submit" disabled={actionLoading || !cashAmount} className="w-full rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50">Simpan Pembayaran Cash</button>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* Unit Allocation Modal */}
      {allocModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setAllocModalItem(null)}>
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-800 dark:text-white/90 mb-1">Alokasi Unit</h3>
            <p className="text-sm text-gray-500 mb-4">
              {allocModalItem.unitType?.name || allocModalItem.unitTypeNameSnapshot} — pilih {allocModalItem.quantity} unit
            </p>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {availableUnits.length === 0 && <p className="text-sm text-gray-400">Tidak ada unit tersedia.</p>}
              {availableUnits.map((u) => {
                const selected = selectedUnitIds.includes(u.id);
                return (
                  <button
                    key={u.id}
                    onClick={() => toggleUnit(u.id)}
                    className={`w-full text-left p-3 rounded-lg border text-sm transition-colors ${
                      selected
                        ? "border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-900/20 dark:text-brand-400 dark:border-brand-700"
                        : "border-gray-200 hover:bg-gray-50 text-gray-700 dark:border-gray-700 dark:hover:bg-gray-800 dark:text-gray-300"
                    }`}
                  >
                    <span className="font-medium">{u.code}</span>
                    {u.name && <span className="text-gray-400 ml-2">{u.name}</span>}
                    {selected && <span className="float-right text-brand-500">✓</span>}
                  </button>
                );
              })}
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={() => setAllocModalItem(null)} className="flex-1 rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300">Batal</button>
              <button
                onClick={saveAllocation}
                disabled={allocLoading || selectedUnitIds.length !== allocModalItem.quantity}
                className="flex-1 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50"
              >
                {allocLoading ? "Menyimpan..." : `Simpan (${selectedUnitIds.length}/${allocModalItem.quantity})`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
