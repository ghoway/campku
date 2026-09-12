"use client";

import React, { useState } from "react";

type Facility = { id: string; name: string };

type UnitType = {
  id: string;
  name: string;
  description: string | null;
  capacity: number;
  weekdayPrice: string;
  weekendPrice: string;
  facilities?: Array<{ facility: Facility }>;
};

type UnitTypeFormValues = {
  name: string;
  description: string;
  capacity: string;
  weekdayPrice: string;
  weekendPrice: string;
  facilityIds: string[];
};

const inputCls =
  "w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-800 dark:text-white";
const labelCls = "block text-gray-700 dark:text-gray-300 mb-1";
const cardCls =
  "rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]";
const sectionCls = "text-sm font-semibold text-gray-800 dark:text-white/90 border-b border-gray-100 pb-2 dark:border-gray-800";

export default function UnitTypeForm({
  initial,
  facilities,
  submitting,
  submitLabel = "Simpan",
  onSubmit,
}: {
  initial?: UnitType | null;
  facilities: Facility[];
  submitting: boolean;
  submitLabel?: string;
  onSubmit: (values: UnitTypeFormValues) => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [capacity, setCapacity] = useState(String(initial?.capacity ?? "2"));
  const [weekdayPrice, setWeekdayPrice] = useState(initial?.weekdayPrice ?? "");
  const [weekendPrice, setWeekendPrice] = useState(initial?.weekendPrice ?? "");
  const [facilityIds, setFacilityIds] = useState<string[]>(
    initial?.facilities?.map((f) => f.facility.id) ?? [],
  );

  const toggleFacility = (id: string) => {
    setFacilityIds((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id],
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !weekdayPrice || !weekendPrice) return;
    onSubmit({ name, description, capacity, weekdayPrice, weekendPrice, facilityIds });
  };

  return (
    <div className={cardCls}>
      <form onSubmit={handleSubmit} className="space-y-6 text-sm">
        <div>
          <h4 className={sectionCls}>Informasi Unit Type</h4>
          <div className="mt-4">
            <label className={labelCls}>Nama Unit Type *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputCls}
              placeholder="Tenda Deluxe / Cabin Family"
            />
            <p className="mt-1 text-[11px] text-gray-400">Contoh: Tenda Riverside, Cabin Keluarga, Glamping Deluxe.</p>
          </div>
          <div className="mt-4">
            <label className={labelCls}>Deskripsi</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className={inputCls}
              placeholder="Sebutkan fasilitas dalam unit: kasur busa, listrik, kamar mandi dalam, dsb."
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mt-4">
            <div>
              <label className={labelCls}>Kapasitas (orang) *</label>
              <input
                type="number"
                required
                min="1"
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                className={inputCls}
                placeholder="4"
              />
            </div>
            <div>
              <label className={labelCls}>Harga Weekday (Rp) *</label>
              <input
                type="number"
                required
                min="0"
                value={weekdayPrice}
                onChange={(e) => setWeekdayPrice(e.target.value)}
                className={inputCls}
                placeholder="250000"
              />
            </div>
            <div>
              <label className={labelCls}>Harga Weekend (Rp) *</label>
              <input
                type="number"
                required
                min="0"
                value={weekendPrice}
                onChange={(e) => setWeekendPrice(e.target.value)}
                className={inputCls}
                placeholder="350000"
              />
            </div>
          </div>
        </div>

        <div>
          <h4 className={sectionCls}>Fasilitas Unit Type</h4>
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