"use client";

import React, { useEffect, useState } from "react";
import { $api } from "@/lib/api";
import { useRouter } from "next/navigation";
import { useDialog } from "@/context/DialogContext";
import { CalendarDays, MapPin, Users, CreditCard, ChevronLeft, ChevronRight } from "lucide-react";

type AvailabilityUnitType = {
  id: string;
  name: string;
  capacity: number;
  available: number;
  totalUnits: number;
  pricing: Array<{ date: string; price: number; rate: string }>;
  total: number;
};

type AvailabilityResponse = {
  propertyId: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  unitTypes: AvailabilityUnitType[];
};

type Property = { id: string; name: string };

type WalkingBookingResponse = {
  booking: { id: string; bookingCode: string; grandTotal: string };
  paymentUrl: string | null;
};

const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e));

const todayLocal = new Date();
const todayStr = `${todayLocal.getFullYear()}-${String(todayLocal.getMonth() + 1).padStart(2, "0")}-${String(
  todayLocal.getDate()
).padStart(2, "0")}`;

const addDays = (dateStr: string, n: number) => {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
};

const PAYMENT_METHODS = [
  { value: "CASH", label: "Cash", desc: "Tunai langsung", icon: "wallet" },
  { value: "QRIS", label: "QRIS", desc: "Scan QRIS", icon: "qrcode" },
  { value: "BANK_TRANSFER", label: "Transfer Bank", desc: "Manual transfer", icon: "landmark" },
];

const STEPS = [
  { key: 1, label: "Properti & Tanggal" },
  { key: 2, label: "Data Tamu" },
  { key: 3, label: "Pembayaran" },
];

export default function WalkInPage() {
  const router = useRouter();
  const dialog = useDialog();
  const [step, setStep] = useState(1);

  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState("");
  const [availabilities, setAvailabilities] = useState<AvailabilityUnitType[]>([]);

  // Form state
  const [checkInDate, setCheckInDate] = useState("");
  const [checkOutDate, setCheckOutDate] = useState("");
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("CASH");

  // Selected units: Record<unitTypeId, quantity>
  const [selectedUnits, setSelectedUnits] = useState<Record<string, number>>({});

  const [checkingAvail, setCheckingAvail] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Active shift check (for POS: walk-in & payment require open shift)
  const [shiftOpen, setShiftOpen] = useState<boolean | null>(null);

  useEffect(() => {
    $api
      .get<Property[]>("/properties?limit=50")
      .then((res) => {
        setProperties(res);
        if (res && res.length > 0) {
          setSelectedPropertyId(res[0].id);
        }
      })
      .catch((e) => setError(errMsg(e)));
  }, []);

  useEffect(() => {
    if (!selectedPropertyId) return;
    $api
      .get<{ id: string } | null>(`/staff/shifts/current?propertyId=${selectedPropertyId}`)
      .then((s) => setShiftOpen(!!s))
      .catch(() => setShiftOpen(false));
  }, [selectedPropertyId]);

  const handleCheckInChange = (value: string) => {
    setCheckInDate(value);
    if (value && checkOutDate && checkOutDate <= value) {
      setCheckOutDate(addDays(value, 1));
    }
    setAvailabilities([]);
    setSelectedUnits({});
    setError("");
  };

  const minCheckOut = checkInDate ? addDays(checkInDate, 1) : todayStr;

  const handleCheckAvailability = async () => {
    if (!selectedPropertyId || !checkInDate || !checkOutDate) {
      alert("Pilih properti dan tanggal check-in & check-out terlebih dahulu.");
      return;
    }
    setCheckingAvail(true);
    setError("");
    try {
      const res = await $api.get<AvailabilityResponse>(
        `/properties/${selectedPropertyId}/availability?checkIn=${checkInDate}&checkOut=${checkOutDate}`
      );
      setAvailabilities(res.unitTypes || []);
      setSelectedUnits({});
      setStep(1);
    } catch (e) {
      setError("Error cek ketersediaan: " + errMsg(e));
    } finally {
      setCheckingAvail(false);
    }
  };

  const handleQuantityChange = (unitTypeId: string, qty: number) => {
    setSelectedUnits((prev) => ({
      ...prev,
      [unitTypeId]: Math.max(0, qty),
    }));
  };

  const selectedItems = Object.entries(selectedUnits)
    .filter(([, qty]) => qty > 0)
    .map(([unitTypeId, quantity]) => ({ unitTypeId, quantity }));

  const totalNights = (() => {
    if (!checkInDate || !checkOutDate) return 0;
    const diff = Date.parse(checkOutDate) - Date.parse(checkInDate);
    return Math.max(0, diff / (1000 * 3600 * 24));
  })();

  const calculateTotal = () => {
    let total = 0;
    for (const item of availabilities) {
      const qty = selectedUnits[item.id] || 0;
      if (qty > 0) {
        total += item.total * qty;
      }
    }
    return total;
  };

  const canNextFromStep1 =
    !!selectedPropertyId && !!checkInDate && !!checkOutDate && availabilities.length > 0 && selectedItems.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedItems.length === 0) {
      alert("Pilih minimal 1 unit.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const res = await $api.post<WalkingBookingResponse>("/staff/bookings/walk-in", {
        propertyId: selectedPropertyId,
        guest: {
          name: guestName,
          phone: guestPhone || null,
          email: guestEmail || null,
        },
        checkIn: checkInDate,
        checkOut: checkOutDate,
        adults,
        children,
        items: selectedItems,
      });

      const booking = res.booking;
      if (!booking?.id) throw new Error("Respon booking tidak valid");

      await $api.post<{ id: string }>(`/bookings/${booking.id}/payments`, {
        method: paymentMethod,
        amount: Number(booking.grandTotal),
      });

      dialog.success({
        title: "Walk-In Booking Berhasil!",
        confirmLabel: "Lihat Detail Booking",
        message: (
          <div className="space-y-3">
            <div className="rounded-xl border border-dashed border-green-300 bg-green-50 p-4 text-center dark:border-green-800 dark:bg-green-900/10">
              <div className="text-xs text-gray-500 dark:text-gray-400">Kode Booking</div>
              <div className="font-mono text-2xl font-bold tracking-widest text-gray-900 dark:text-white">
                {booking.bookingCode}
              </div>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Total</span>
              <span className="font-semibold text-gray-800 dark:text-white/90">
                {fmtRp(Number(booking.grandTotal))}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Metode Pembayaran</span>
              <span className="font-semibold text-gray-800 dark:text-white/90">
                {paymentLabel(paymentMethod)}
              </span>
            </div>
          </div>
        ),
        onConfirm: () => router.push(`/bookings/${booking.id}`),
      });
    } catch (e) {
      const msg = errMsg(e);
      if (msg.includes("NO_ACTIVE_SHIFT")) {
        alert("Buka shift kasir terlebih dahulu di menu Shift sebelum membuat walk-in booking.");
      } else {
        setError("Error membuat Walk-In booking: " + msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const fmtRp = (v: number) => "Rp" + v.toLocaleString("id-ID");
  const paymentLabel = (m: string) => PAYMENT_METHODS.find((p) => p.value === m)?.label ?? m;

  return (
    <div className="grid grid-cols-12 gap-6">
      <div className="col-span-12">
        <h2 className="text-xl font-bold text-gray-800 dark:text-white/90">Walk-In & On-Site Reservation (POS)</h2>
        <p className="text-sm text-gray-500">Reservasi cepat langsung di lokasi camping ground oleh staff.</p>
      </div>

      {/* Stepper indicator */}
      <div className="col-span-12">
        <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="flex items-center justify-between">
            {STEPS.map((s, i) => {
              const done = step > s.key;
              const active = step === s.key;
              return (
                <div key={s.key} className="flex items-center flex-1 last:flex-none">
                  <button
                    type="button"
                    onClick={() => s.key < step && setStep(s.key)}
                    className={`flex items-center gap-2 ${s.key < step ? "cursor-pointer" : "cursor-default"}`}
                  >
                    <span
                      className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
                        done
                          ? "bg-green-500 text-white"
                          : active
                            ? "bg-brand-500 text-white"
                            : "bg-gray-100 text-gray-500 dark:bg-gray-800"
                      }`}
                    >
                      {done ? "✓" : s.key}
                    </span>
                    <span
                      className={`hidden sm:block text-sm font-medium ${
                        active || done ? "text-gray-800 dark:text-white/90" : "text-gray-400"
                      }`}
                    >
                      {s.label}
                    </span>
                  </button>
                  {i < STEPS.length - 1 && (
                    <div className={`mx-3 h-px flex-1 ${done ? "bg-green-500" : "bg-gray-200 dark:bg-gray-700"}`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Banner: shift harus dibuka */}
      {shiftOpen === false && step >= 3 && (
        <div className="col-span-12">
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900/30 dark:bg-amber-900/10 dark:text-amber-300">
            Shift kasir belum dibuka di properti ini. Buka dulu di menu <strong>Shift</strong> agar walk-in booking dan
            pembayaran bisa diproses.
          </div>
        </div>
      )}

      {error && (
        <div className="col-span-12">
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/30 dark:bg-red-900/10 dark:text-red-400">
            {error}
          </div>
        </div>
      )}

      <div className="col-span-12 lg:col-span-7">
        {step === 1 && (
          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] space-y-4">
            <h3 className="font-semibold text-gray-800 dark:text-white/90 flex items-center gap-2">
              <MapPin className="h-4 w-4 text-brand-500" /> Properti & Tanggal Menginap
            </h3>

            <div>
              <label className="block text-xs text-gray-500 mb-1">Pilih Properti Camping Ground</label>
              <select
                name="propertyId"
                value={selectedPropertyId}
                onChange={(e) => {
                  setSelectedPropertyId(e.target.value);
                  setAvailabilities([]);
                  setSelectedUnits({});
                  setShiftOpen(null);
                }}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              >
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Tanggal Check-In</label>
                <div className="relative">
                  <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="date"
                    name="checkIn"
                    min={todayStr}
                    value={checkInDate}
                    onChange={(e) => handleCheckInChange(e.target.value)}
                    className="w-full cursor-pointer rounded-lg border border-gray-300 pl-9 pr-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Tanggal Check-Out</label>
                <div className="relative">
                  <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="date"
                    name="checkOut"
                    min={minCheckOut}
                    value={checkOutDate}
                    onChange={(e) => {
                      setCheckOutDate(e.target.value);
                      setAvailabilities([]);
                      setSelectedUnits({});
                    }}
                    className="w-full cursor-pointer rounded-lg border border-gray-300 pl-9 pr-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                  />
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleCheckAvailability}
              disabled={checkingAvail || !checkInDate || !checkOutDate}
              className="w-full rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50"
            >
              {checkingAvail ? "Checking..." : "Cek Ketersediaan Unit"}
            </button>

            {availabilities.length > 0 && (
              <div className="pt-2 border-t border-gray-100 dark:border-gray-800 space-y-3">
                <h4 className="text-sm font-semibold text-gray-800 dark:text-white/90">
                  Pilih Tipe Unit & Tenda ({totalNights} malam)
                </h4>
                {availabilities.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 rounded-xl border border-gray-100 dark:border-gray-800 flex justify-between items-center"
                  >
                    <div>
                      <h4 className="font-medium text-gray-800 dark:text-white/90">{item.name}</h4>
                      <span className="text-xs text-gray-500 block">
                        Tersedia: {item.available} unit (Total {item.totalUnits})
                      </span>
                      <span className="text-xs font-semibold text-brand-600">
                        {fmtRp(item.pricing[0]?.price ?? 0)} / malam
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={item.available === 0}
                        onClick={() => handleQuantityChange(item.id, (selectedUnits[item.id] || 0) - 1)}
                        className="h-8 w-8 rounded-lg border border-gray-300 flex items-center justify-center font-bold text-gray-700 dark:border-gray-700 dark:text-gray-300 disabled:opacity-30"
                      >
                        -
                      </button>
                      <span className="w-8 text-center font-bold text-gray-800 dark:text-white">
                        {selectedUnits[item.id] || 0}
                      </span>
                      <button
                        type="button"
                        disabled={item.available === 0 || (selectedUnits[item.id] || 0) >= item.available}
                        onClick={() => handleQuantityChange(item.id, (selectedUnits[item.id] || 0) + 1)}
                        className="h-8 w-8 rounded-lg border border-gray-300 flex items-center justify-center font-bold text-gray-700 dark:border-gray-700 dark:text-gray-300 disabled:opacity-30"
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setStep(2)}
                disabled={!canNextFromStep1}
                className="flex items-center gap-1 rounded-xl bg-brand-500 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50"
              >
                Lanjut ke Data Tamu <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] space-y-4">
            <h3 className="font-semibold text-gray-800 dark:text-white/90 flex items-center gap-2">
              <Users className="h-4 w-4 text-brand-500" /> Data Tamu
            </h3>

            <div>
              <label className="block text-xs text-gray-500 mb-1">Nama Tamu *</label>
              <input
                type="text"
                name="name"
                required
                placeholder="Nama Lengkap Tamu"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">Email Tamu (opsional)</label>
              <input
                type="email"
                name="email"
                placeholder="tamu@example.com"
                value={guestEmail}
                onChange={(e) => setGuestEmail(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">Nomor WhatsApp / Phone</label>
              <input
                type="text"
                name="phone"
                placeholder="081234567890"
                value={guestPhone}
                onChange={(e) => setGuestPhone(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Dewasa</label>
                <input
                  type="number"
                  name="adults"
                  min="1"
                  required
                  value={adults}
                  onChange={(e) => setAdults(Number(e.target.value))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Anak-anak</label>
                <input
                  type="number"
                  name="children"
                  min="0"
                  value={children}
                  onChange={(e) => setChildren(Number(e.target.value))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                />
              </div>
            </div>

            <div className="flex justify-between pt-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex items-center gap-1 rounded-xl border border-gray-300 px-5 py-2 text-sm font-medium text-gray-700 dark:border-gray-700 dark:text-gray-300"
              >
                <ChevronLeft className="h-4 w-4" /> Kembali
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                disabled={!guestName.trim()}
                className="flex items-center gap-1 rounded-xl bg-brand-500 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50"
              >
                Lanjut ke Pembayaran <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] space-y-4">
            <h3 className="font-semibold text-gray-800 dark:text-white/90 flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-brand-500" /> Metode Pembayaran
            </h3>

            <div className="grid grid-cols-3 gap-3">
              {PAYMENT_METHODS.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setPaymentMethod(m.value)}
                  className={`rounded-xl border p-3 text-left transition-colors ${
                    paymentMethod === m.value
                      ? "border-brand-500 bg-brand-50 dark:bg-brand-500/10"
                      : "border-gray-200 hover:border-gray-300 dark:border-gray-700"
                  }`}
                >
                  <span className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-800 dark:text-white/90">{m.label}</span>
                    {paymentMethod === m.value && <span className="text-brand-500">✓</span>}
                  </span>
                  <span className="block text-xs text-gray-500 mt-1">{m.desc}</span>
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="pt-4 border-t border-gray-200 dark:border-gray-800 space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500">Grup Tamu</span>
                  <span className="font-medium text-gray-800 dark:text-white/90">
                    {adults} dewasa · {children} anak
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500">Unit</span>
                  <span className="font-medium text-gray-800 dark:text-white/90">{selectedItems.length} tipe</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500">Durasi</span>
                  <span className="font-medium text-gray-800 dark:text-white/90">{totalNights} malam</span>
                </div>
                <div className="flex justify-between items-center text-sm font-semibold">
                  <span>Total {paymentLabel(paymentMethod)}</span>
                  <span className="text-lg text-brand-600">{fmtRp(calculateTotal())}</span>
                </div>
                <button
                  type="submit"
                  disabled={submitting || calculateTotal() === 0 || !guestName.trim()}
                  className="w-full rounded-xl bg-green-600 px-4 py-3 font-semibold text-white hover:bg-green-700 disabled:opacity-50"
                >
                  {submitting ? "Memproses..." : `Buat Booking & Terima ${paymentLabel(paymentMethod)}`}
                </button>
              </div>
            </form>

            <div className="flex justify-between pt-1">
              <button
                type="button"
                onClick={() => setStep(2)}
                disabled={submitting}
                className="flex items-center gap-1 rounded-xl border border-gray-300 px-5 py-2 text-sm font-medium text-gray-700 dark:border-gray-700 dark:text-gray-300"
              >
                <ChevronLeft className="h-4 w-4" /> Kembali
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Ringkasan tetap tampil */}
      <div className="col-span-12 lg:col-span-5">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] space-y-3 sticky top-24">
          <h3 className="font-semibold text-gray-800 dark:text-white/90">Ringkasan</h3>
          <div className="text-sm space-y-2">
            {selectedPropertyId && (
              <div className="flex justify-between">
                <span className="text-gray-500">Properti</span>
                <span className="font-medium text-gray-800 dark:text-white/90">
                  {properties.find((p) => p.id === selectedPropertyId)?.name ?? "-"}
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-500">Check-In</span>
              <span className="font-medium text-gray-800 dark:text-white/90">{checkInDate || "-"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Check-Out</span>
              <span className="font-medium text-gray-800 dark:text-white/90">{checkOutDate || "-"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Tamu</span>
              <span className="font-medium text-gray-800 dark:text-white/90">{guestName || "-"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Metode Bayar</span>
              <span className="font-medium text-gray-800 dark:text-white/90">
                {paymentMethod ? paymentLabel(paymentMethod) : "-"}
              </span>
            </div>
            <div className="pt-2 border-t border-gray-200 dark:border-gray-800 flex justify-between items-center">
              <span className="font-semibold text-gray-800 dark:text-white/90">Total</span>
              <span className="text-lg font-bold text-brand-600">{fmtRp(calculateTotal())}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}