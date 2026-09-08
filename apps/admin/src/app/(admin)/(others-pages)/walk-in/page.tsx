"use client";

import React, { useEffect, useState } from "react";
import { $api } from "@/lib/api";
import { useRouter } from "next/navigation";

type Property = {
  id: string;
  name: string;
  unitTypes: Array<{
    id: string;
    name: string;
    basePrice: string;
    capacity: number;
    totalUnits: number;
  }>;
};

type AvailabilityItem = {
  unitTypeId: string;
  unitTypeName: string;
  totalUnits: number;
  blockedUnits: number;
  availableUnits: number;
  pricePerNight: number;
};

export default function WalkInPage() {
  const router = useRouter();
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState("");
  const [availabilities, setAvailabilities] = useState<AvailabilityItem[]>([]);

  // Form state
  const [checkInDate, setCheckInDate] = useState("");
  const [checkOutDate, setCheckOutDate] = useState("");
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);

  // Selected units: Record<unitTypeId, quantity>
  const [selectedUnits, setSelectedUnits] = useState<Record<string, number>>({});
  
  const [loading, setLoading] = useState(false);
  const [checkingAvail, setCheckingAvail] = useState(false);

  useEffect(() => {
    $api
      .get<Property[]>("/properties?limit=50")
      .then((res) => {
        setProperties(res);
        if (res && res.length > 0) {
          setSelectedPropertyId(res[0].id);
        }
      })
      .catch(console.error);
  }, []);

  const handleCheckAvailability = async () => {
    if (!selectedPropertyId || !checkInDate || !checkOutDate) {
      alert("Pilih properti dan tanggal check-in & check-out terlebih dahulu.");
      return;
    }
    setCheckingAvail(true);
    try {
      const res = await $api.get<AvailabilityItem[]>(
        `/properties/${selectedPropertyId}/availability?checkInDate=${checkInDate}&checkOutDate=${checkOutDate}`
      );
      setAvailabilities(res);
      setSelectedUnits({});
    } catch (e: any) {
      alert("Error cek ketersediaan: " + e.message);
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

  const calculateTotal = () => {
    let total = 0;
    for (const item of availabilities) {
      const qty = selectedUnits[item.unitTypeId] || 0;
      if (qty > 0) {
        // Calculate nights
        const inDate = new Date(checkInDate);
        const outDate = new Date(checkOutDate);
        const nights = Math.max(1, Math.ceil((outDate.getTime() - inDate.getTime()) / (1000 * 3600 * 24)));
        total += item.pricePerNight * qty * nights;
      }
    }
    return total;
  };

  const handleCreateWalkIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const items = Object.entries(selectedUnits)
      .filter(([_, qty]) => qty > 0)
      .map(([unitTypeId, quantity]) => ({ unitTypeId, quantity }));

    if (items.length === 0) {
      alert("Pilih minimal 1 tenda/unit.");
      return;
    }

    setLoading(true);
    try {
      const res = await $api.post<{ id: string; bookingCode: string }>("/staff/bookings/walk-in", {
        propertyId: selectedPropertyId,
        checkInDate,
        checkOutDate,
        guestName,
        guestEmail,
        guestPhone: guestPhone || undefined,
        adults,
        children,
        items,
        paymentMethod: "CASH",
      });

      alert(`Walk-In Booking Berhasil! Kode: ${res.bookingCode}`);
      router.push(`/bookings/${res.id}`);
    } catch (e: any) {
      alert("Error membuat Walk-In booking: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const fmtRp = (v: number) => "Rp" + v.toLocaleString("id-ID");

  return (
    <div className="grid grid-cols-12 gap-6">
      <div className="col-span-12">
        <h2 className="text-xl font-bold text-gray-800 dark:text-white/90">Walk-In & On-Site Reservation (POS)</h2>
        <p className="text-sm text-gray-500">Form reservasi cepat langsung di lokasi camping ground oleh staff.</p>
      </div>

      <div className="col-span-12 lg:col-span-7 space-y-6">
        {/* Step 1: Pilih Properti & Tanggal */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] space-y-4">
          <h3 className="font-semibold text-gray-800 dark:text-white/90">1. Properti & Tanggal Menginap</h3>
          
          <div>
            <label className="block text-xs text-gray-500 mb-1">Pilih Properti Camping Ground</label>
            <select
              value={selectedPropertyId}
              onChange={(e) => {
                setSelectedPropertyId(e.target.value);
                setAvailabilities([]);
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
              <input
                type="date"
                value={checkInDate}
                onChange={(e) => setCheckInDate(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Tanggal Check-Out</label>
              <input
                type="date"
                value={checkOutDate}
                onChange={(e) => setCheckOutDate(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              />
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
        </div>

        {/* Step 2: Pilih Unit Type & Kuantitas */}
        {availabilities.length > 0 && (
          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] space-y-4">
            <h3 className="font-semibold text-gray-800 dark:text-white/90">2. Pilih Tipe Unit & Tenda</h3>
            <div className="space-y-3">
              {availabilities.map((item) => (
                <div key={item.unitTypeId} className="p-4 rounded-xl border border-gray-100 dark:border-gray-800 flex justify-between items-center">
                  <div>
                    <h4 className="font-medium text-gray-800 dark:text-white/90">{item.unitTypeName}</h4>
                    <span className="text-xs text-gray-500 block">Tersedia: {item.availableUnits} unit (Total {item.totalUnits})</span>
                    <span className="text-xs font-semibold text-brand-600">{fmtRp(item.pricePerNight)} / malam</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={item.availableUnits === 0}
                      onClick={() => handleQuantityChange(item.unitTypeId, (selectedUnits[item.unitTypeId] || 0) - 1)}
                      className="h-8 w-8 rounded-lg border border-gray-300 flex items-center justify-center font-bold text-gray-700 dark:border-gray-700 dark:text-gray-300 disabled:opacity-30"
                    >
                      -
                    </button>
                    <span className="w-8 text-center font-bold text-gray-800 dark:text-white">{selectedUnits[item.unitTypeId] || 0}</span>
                    <button
                      type="button"
                      disabled={item.availableUnits === 0 || (selectedUnits[item.unitTypeId] || 0) >= item.availableUnits}
                      onClick={() => handleQuantityChange(item.unitTypeId, (selectedUnits[item.unitTypeId] || 0) + 1)}
                      className="h-8 w-8 rounded-lg border border-gray-300 flex items-center justify-center font-bold text-gray-700 dark:border-gray-700 dark:text-gray-300 disabled:opacity-30"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Step 3: Data Tamu & Form Submit */}
      <div className="col-span-12 lg:col-span-5">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] space-y-4">
          <h3 className="font-semibold text-gray-800 dark:text-white/90">3. Data Tamu & Ringkasan Pembayaran</h3>

          <form onSubmit={handleCreateWalkIn} className="space-y-3 text-sm">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Nama Tamu *</label>
              <input
                type="text"
                required
                placeholder="Nama Lengkap Tamu"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">Email Tamu *</label>
              <input
                type="email"
                required
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
                  min="0"
                  value={children}
                  onChange={(e) => setChildren(Number(e.target.value))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-gray-200 dark:border-gray-800 space-y-2">
              <div className="flex justify-between items-center text-sm font-semibold">
                <span>Total Estimasi (CASH):</span>
                <span className="text-lg text-brand-600">{fmtRp(calculateTotal())}</span>
              </div>
              <button
                type="submit"
                disabled={loading || calculateTotal() === 0 || !guestName || !guestEmail}
                className="w-full rounded-xl bg-green-600 px-4 py-3 font-semibold text-white hover:bg-green-700 disabled:opacity-50"
              >
                {loading ? "Processing..." : "Buat Walk-In Booking (Terima Cash)"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
