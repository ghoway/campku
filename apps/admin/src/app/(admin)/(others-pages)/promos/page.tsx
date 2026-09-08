"use client";

import React, { useEffect, useState } from "react";
import { $api } from "@/lib/api";

type Promo = {
  id: string;
  code: string;
  name: string | null;
  description: string | null;
  discountType: "PERCENTAGE" | "FIXED";
  discountValue: string;
  minBookingAmount: string;
  maxUses: number;
  currentUses: number;
  startAt: string;
  expiresAt: string | null;
  isActive: boolean;
};

export default function PromosPage() {
  const [promos, setPromos] = useState<Promo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);

  // Form state
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [discountType, setDiscountType] = useState<"PERCENTAGE" | "FIXED">("PERCENTAGE");
  const [discountValue, setDiscountValue] = useState("");
  const [minBookingAmount, setMinBookingAmount] = useState("");
  const [maxUses, setMaxUses] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadPromos = () => {
    setLoading(true);
    $api
      .get<{ data: Promo[] }>("/admin/promos")
      .then((res) => {
        setPromos(Array.isArray(res) ? res : []);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadPromos();
  }, []);

  const handleCreatePromo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || !name || !discountValue || !startDate || !endDate) return;
    setSubmitting(true);
    try {
      await $api.post("/admin/promos", {
        code: code.toUpperCase(),
        name,
        description: description || undefined,
        discountType,
        discountValue: Number(discountValue),
        minBookingAmount: minBookingAmount ? Number(minBookingAmount) : 0,
        maxUses: maxUses ? Number(maxUses) : 0,
        startAt: new Date(startDate + "T00:00:00Z").toISOString(),
        expiresAt: new Date(endDate + "T23:59:59Z").toISOString(),
      });
      alert("Kode promo berhasil dibuat!");
      setShowModal(false);
      setCode("");
      setName("");
      setDescription("");
      setDiscountValue("");
      setMinBookingAmount("");
      setMaxUses("");
      loadPromos();
    } catch (e: any) {
      alert("Error: " + e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const fmt = (d: string) => new Date(d).toISOString().slice(0, 10);
  const fmtRp = (v: string | number) => "Rp" + Number(v).toLocaleString("id-ID");

  if (loading) return <div className="p-5 text-gray-500">Loading promos...</div>;

  return (
    <div className="grid grid-cols-12 gap-6">
      <div className="col-span-12 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-gray-800 dark:text-white/90">Promos & Discounts</h2>
          <p className="text-sm text-gray-500">Manajemen kode promo dan diskon reservasi.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
        >
          + Tambah Promo
        </button>
      </div>

      <div className="col-span-12">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800 text-xs text-gray-500 uppercase">
                  <th className="py-3 px-4 text-left">Kode</th>
                  <th className="py-3 px-4 text-left">Deskripsi</th>
                  <th className="py-3 px-4 text-left">Diskon</th>
                  <th className="py-3 px-4 text-left">Kuota Dipakai</th>
                  <th className="py-3 px-4 text-left">Masa Berlaku</th>
                  <th className="py-3 px-4 text-left">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-sm">
                {promos.map((p) => (
                  <tr key={p.id}>
                    <td className="py-3 px-4 font-bold text-brand-600">
                      {p.code}
                      <span className="block text-xs font-normal text-gray-500">{p.name}</span>
                    </td>
                    <td className="py-3 px-4 text-gray-600 dark:text-gray-300">{p.description ?? "-"}</td>
                    <td className="py-3 px-4 font-medium">
                      {p.discountType === "PERCENTAGE" ? `${p.discountValue}%` : fmtRp(p.discountValue)}
                    </td>
                    <td className="py-3 px-4 text-gray-600 dark:text-gray-300">
                      {p.currentUses} / {p.maxUses > 0 ? p.maxUses : "∞"}
                    </td>
                    <td className="py-3 px-4 text-xs text-gray-500">
                      {fmt(p.startAt)} → {p.expiresAt ? fmt(p.expiresAt) : "Selamanya"}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2.5 py-0.5 text-xs rounded-full font-medium ${
                          p.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {p.isActive ? "Aktif" : "Non-aktif"}
                      </span>
                    </td>
                  </tr>
                ))}
                {!promos.length && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-sm text-gray-400">
                      Belum ada promo.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal Tambah Promo */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900">
            <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">Buat Kode Promo</h3>
            <form onSubmit={handleCreatePromo} className="space-y-4 text-sm">
              <div>
                <label className="block text-gray-700 dark:text-gray-300 mb-1">Kode Promo</label>
                <input
                  type="text"
                  required
                  placeholder="MISAL: DISKONWEEKEND"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 uppercase dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-gray-700 dark:text-gray-300 mb-1">Deskripsi</label>
                <input
                  type="text"
                  placeholder="Diskon spesial awal bulan"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-700 dark:text-gray-300 mb-1">Tipe Diskon</label>
                  <select
                    value={discountType}
                    onChange={(e: any) => setDiscountType(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  >
                    <option value="PERCENTAGE">Persentase (%)</option>
                    <option value="FIXED">Nominal (Rp)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-gray-700 dark:text-gray-300 mb-1">Nilai Diskon</label>
                  <input
                    type="number"
                    required
                    placeholder={discountType === "PERCENTAGE" ? "10" : "50000"}
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-700 dark:text-gray-300 mb-1">Nama Promo *</label>
                <input
                  type="text"
                  required
                  placeholder="Diskon Spesial Akhir Pekan"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-gray-700 dark:text-gray-300 mb-1">Deskripsi</label>
                <input
                  type="text"
                  placeholder="Diskon 15% untuk booking weekend"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-gray-700 dark:text-gray-300 mb-1">Minimal Booking (Rp)</label>
                <input
                  type="number"
                  min="0"
                  value={minBookingAmount}
                  onChange={(e) => setMinBookingAmount(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  placeholder="0"
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="w-1/2 rounded-xl border border-gray-300 px-4 py-2 font-medium text-gray-700 dark:border-gray-700 dark:text-gray-300"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-1/2 rounded-xl bg-brand-500 px-4 py-2 font-semibold text-white hover:bg-brand-600 disabled:opacity-50"
                >
                  Simpan Promo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
