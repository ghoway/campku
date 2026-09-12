"use client";

import React, { useState } from "react";

type Facility = { id: string; name: string };

type PropertyFormValues = {
  code: string;
  name: string;
  description: string;
  city: string;
  province: string;
  address: string;
  latitude?: string;
  longitude?: string;
  checkInTime: string;
  checkOutTime: string;
  timezone: string;
  facilityIds: string[];
};

type PropertyDetail = {
  id: string;
  name: string;
  code: string;
  slug: string;
  description: string | null;
  city: string;
  province: string | null;
  address: string | null;
  latitude?: string | number | null;
  longitude?: string | number | null;
  status: string;
  checkInTime: string;
  checkOutTime: string;
  timezone: string;
  propertyFacilities: Array<{ facility: Facility }>;
};

const inputCls =
  "w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-800 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-800/50";
const labelCls = "block text-gray-700 dark:text-gray-300 mb-1";
const cardCls =
  "rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]";
const sectionCls = "text-sm font-semibold text-gray-800 dark:text-white/90 border-b border-gray-100 pb-2 dark:border-gray-800";

export default function PropertyForm({
  mode,
  initial,
  facilities,
  submitting,
  submitLabel = "Simpan",
  onSubmit,
}: {
  mode: "create" | "edit";
  initial?: PropertyDetail | null;
  facilities: Facility[];
  submitting: boolean;
  submitLabel?: string;
  onSubmit: (values: PropertyFormValues) => void;
}) {
  const [code, setCode] = useState(initial?.code ?? "");
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [city, setCity] = useState(initial?.city ?? "");
  const [province, setProvince] = useState(initial?.province ?? "");
  const [address, setAddress] = useState(initial?.address ?? "");
  const [latitude, setLatitude] = useState(initial?.latitude != null ? String(initial.latitude) : "");
  const [longitude, setLongitude] = useState(initial?.longitude != null ? String(initial.longitude) : "");
  const [checkInTime, setCheckInTime] = useState(initial?.checkInTime ?? "14:00");
  const [checkOutTime, setCheckOutTime] = useState(initial?.checkOutTime ?? "12:00");
  const [timezone, setTimezone] = useState(initial?.timezone ?? "Asia/Jakarta");
  const [facilityIds, setFacilityIds] = useState<string[]>(
    initial?.propertyFacilities?.map((pf) => pf.facility.id) ?? [],
  );

  const toggleFacility = (id: string) => {
    setFacilityIds((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id],
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !city || (mode === "create" && !code)) return;
    onSubmit({
      code,
      name,
      description,
      city,
      province,
      address,
      latitude: latitude.trim() ? latitude : undefined,
      longitude: longitude.trim() ? longitude : undefined,
      checkInTime,
      checkOutTime,
      timezone,
      facilityIds,
    });
  };

  return (
    <div className={cardCls}>
      <form onSubmit={handleSubmit} className="space-y-6 text-sm">
        {/* ==== Informasi Dasar ==== */}
        <div>
          <h4 className={sectionCls}>Informasi Dasar</h4>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mt-4">
            <div>
              <label className={labelCls}>Kode Properti *</label>
              <input
                type="text"
                required={mode === "create"}
                disabled={mode === "edit"}
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className={inputCls}
                placeholder="PKC"
              />
              {mode === "edit" && (
                <p className="mt-1 text-[11px] text-gray-400">Kode tidak bisa diubah setelah properti dibuat.</p>
              )}
            </div>
            <div>
              <label className={labelCls}>Nama Properti *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputCls}
                placeholder="Campku Pine Valley"
              />
            </div>
          </div>
          <div className="mt-4">
            <label className={labelCls}>Deskripsi Properti</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className={inputCls}
              placeholder="Ceritakan tentang properti: suasana, view, aktivitas, dsb."
            />
          </div>
        </div>

        {/* ==== Lokasi ==== */}
        <div>
          <h4 className={sectionCls}>Lokasi</h4>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mt-4">
            <div>
              <label className={labelCls}>Kota *</label>
              <input
                type="text"
                required
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className={inputCls}
                placeholder="Bandung"
              />
            </div>
            <div>
              <label className={labelCls}>Provinsi</label>
              <input
                type="text"
                value={province}
                onChange={(e) => setProvince(e.target.value)}
                className={inputCls}
                placeholder="Jawa Barat"
              />
            </div>
          </div>
          <div className="mt-4">
            <label className={labelCls}>Alamat Lengkap</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className={inputCls}
              placeholder="Jl. Raya ..."
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mt-4">
            <div>
              <label className={labelCls}>Latitude</label>
              <input
                type="text"
                inputMode="decimal"
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                className={inputCls}
                placeholder="-6.2088"
              />
            </div>
            <div>
              <label className={labelCls}>Longitude</label>
              <input
                type="text"
                inputMode="decimal"
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
                className={inputCls}
                placeholder="106.8456"
              />
            </div>
          </div>
        </div>

        {/* ==== Operasional ==== */}
        <div>
          <h4 className={sectionCls}>Operasional</h4>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mt-4">
            <div>
              <label className={labelCls}>Check-in Time</label>
              <input
                type="time"
                value={checkInTime}
                onChange={(e) => setCheckInTime(e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Check-out Time</label>
              <input
                type="time"
                value={checkOutTime}
                onChange={(e) => setCheckOutTime(e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Timezone</label>
              <input
                type="text"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className={inputCls}
              />
            </div>
          </div>
        </div>

        {/* ==== Fasilitas ==== */}
        <div>
          <h4 className={sectionCls}>Fasilitas Properti</h4>
          <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto rounded-lg border border-gray-200 p-3 dark:border-gray-700 sm:grid-cols-2 mt-4">
            {facilities.map((f) => (
              <label
                key={f.id}
                className="flex items-center gap-2 text-gray-700 dark:text-gray-300"
              >
                <input
                  type="checkbox"
                  checked={facilityIds.includes(f.id)}
                  onChange={() => toggleFacility(f.id)}
                  className="rounded border-gray-300"
                />
                <span className="text-sm">{f.name}</span>
              </label>
            ))}
            {!facilities.length && (
              <p className="text-xs text-gray-400">Belum ada fasilitas aktif.</p>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-gray-200 pt-4 dark:border-gray-800">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-xl bg-brand-500 px-6 py-2.5 font-semibold text-white hover:bg-brand-600 disabled:opacity-50"
          >
            {submitting ? "Menyimpan..." : submitLabel}
          </button>
        </div>
      </form>
    </div>
  );
}