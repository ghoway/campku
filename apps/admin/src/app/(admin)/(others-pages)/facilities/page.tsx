"use client";

import React, { useEffect, useState } from "react";
import { $api } from "@/lib/api";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import FacilityIcon, { isValidIconName } from "@/components/facility/FacilityIcon";

type Facility = {
  id: string;
  name: string;
  icon: string | null;
  status: "ACTIVE" | "INACTIVE";
};

const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e));

const cardCls =
  "rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]";
const inputCls =
  "w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-800 dark:text-white";
const labelCls = "block text-xs text-gray-700 dark:text-gray-300 mb-1";

const QUICK_ICONS: { label: string; name: string }[] = [
  { label: "Listrik", name: "zap" },
  { label: "Shower", name: "shower-head" },
  { label: "WiFi", name: "wifi" },
  { label: "Parkir", name: "parking-square" },
  { label: "Makan", name: "utensils" },
  { label: "Api Unggun", name: "flame" },
  { label: "Pet", name: "paw-print" },
  { label: "Air", name: "droplets" },
  { label: "Beds", name: "bed-double" },
  { label: "Hijau", name: "tree-pine" },
  { label: "Gunung", name: "mountain" },
  { label: "Kendaraan", name: "car" },
  { label: "AC", name: "snowflake" },
  { label: "Kulkas", name: "refrigerator" },
  { label: "Dapur", name: "cooking-pot" },
  { label: "Kopi", name: "coffee" },
  { label: "Stopkontak", name: "plug" },
  { label: "Tenda", name: "tent" },
  { label: "Pancing", name: "fish" },
  { label: "Sepeda", name: "bike" },
  { label: "Anjing", name: "dog" },
  { label: "Matahari", name: "sun" },
  { label: "Keamanan", name: "shield-check" },
  { label: "Ruang Keluarga", name: "armchair" },
  { label: "Kamar Mandi", name: "bath" },
  { label: "TV", name: "tv" },
  { label: "Musik", name: "music" },
];

export default function FacilitiesPage() {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Create/Edit modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Facility | null>(null);
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  // Toggle status confirmation
  const [toggleTarget, setToggleTarget] = useState<Facility | null>(null);
  const [toggling, setToggling] = useState(false);

  const loadData = () => {
    $api
      .get<Facility[]>("/admin/facilities")
      .then((f) => setFacilities(Array.isArray(f) ? f : []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, []);

  const openCreate = () => {
    setEditing(null);
    setName("");
    setIcon("");
    setFormError("");
    setModalOpen(true);
  };

  const openEdit = (f: Facility) => {
    setEditing(f);
    setName(f.name);
    setIcon(f.icon ?? "");
    setFormError("");
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setFormError("");
    try {
      if (editing) {
        await $api.patch(`/admin/facilities/${editing.id}`, {
          name: name.trim(),
          icon: icon.trim() || undefined,
        });
      } else {
        await $api.post("/admin/facilities", {
          name: name.trim(),
          icon: icon.trim() || undefined,
        });
      }
      setModalOpen(false);
      loadData();
    } catch (e) {
      setFormError(errMsg(e));
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async () => {
    if (!toggleTarget) return;
    setToggling(true);
    try {
      const nextStatus = toggleTarget.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
      await $api.patch(`/admin/facilities/${toggleTarget.id}`, { status: nextStatus });
      setToggleTarget(null);
      loadData();
    } catch (e) {
      alert("Error: " + errMsg(e));
    } finally {
      setToggling(false);
    }
  };

  const activeCount = facilities.filter((f) => f.status === "ACTIVE").length;

  return (
    <div className="grid grid-cols-12 gap-6">
      <div className="col-span-12 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-gray-800 dark:text-white/90">Master Fasilitas</h2>
          <p className="text-sm text-gray-500">
            {facilities.length} fasilitas · {activeCount} aktif — dipakai untuk properti & unit type.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
        >
          + Tambah Fasilitas
        </button>
      </div>

      <div className="col-span-12">
        <div className={cardCls}>
          {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
          {loading && <p className="text-sm text-gray-500">Loading fasilitas...</p>}
          {!loading && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px]">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-800 text-xs text-gray-500 uppercase">
                    <th className="py-3 px-4 text-left">Nama</th>
                    <th className="py-3 px-4 text-left">Icon</th>
                    <th className="py-3 px-4 text-left">Status</th>
                    <th className="py-3 px-4 text-left">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-sm">
                  {(facilities || []).map((f) => (
                    <tr key={f.id}>
                      <td className="py-3 px-4 font-medium text-gray-800 dark:text-white/90">{f.name}</td>
                      <td className="py-3 px-4 text-gray-500">
  {f.icon ? (
    <span className="flex items-center gap-2">
      <FacilityIcon name={f.icon} className="h-5 w-5 text-gray-600 dark:text-gray-300" />
      <span className="text-xs text-gray-500 dark:text-gray-400">{f.icon}</span>
    </span>
  ) : (
    <span className="text-sm text-gray-400">-</span>
  )}
</td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            f.status === "ACTIVE"
                              ? "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300"
                              : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                          }`}
                        >
                          {f.status}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex gap-3">
                          <button
                            onClick={() => openEdit(f)}
                            className="text-sm font-medium text-blue-500 hover:text-blue-600"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => setToggleTarget(f)}
                            className={`text-sm font-medium ${
                              f.status === "ACTIVE"
                                ? "text-red-500 hover:text-red-600"
                                : "text-green-600 hover:text-green-700"
                            }`}
                          >
                            {f.status === "ACTIVE" ? "Nonaktifkan" : "Aktifkan"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!facilities?.length && (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-sm text-gray-400">
                        Belum ada fasilitas.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Create / Edit modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
          onClick={() => !saving && setModalOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-white p-6 dark:bg-gray-900"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-gray-800 dark:text-white/90 mb-4">
              {editing ? "Edit Fasilitas" : "Tambah Fasilitas"}
            </h3>
            <form onSubmit={handleSave} className="space-y-4 text-sm">
              {formError && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/30 dark:bg-red-900/10 dark:text-red-400">
                  {formError}
                </div>
              )}
              <div>
                <label className={labelCls}>Nama Fasilitas *</label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={inputCls}
                  placeholder="Bersih & Aman / Shower Air Hangat"
                />
              </div>
              <div>
                <label className={labelCls}>Icon (nama ikon lucide)</label>
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    value={icon}
                    onChange={(e) => setIcon(e.target.value)}
                    className={inputCls}
                    placeholder="shower-head"
                  />
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700">
                    <FacilityIcon name={icon} className="h-5 w-5 text-gray-700 dark:text-gray-200" />
                  </span>
                </div>
                {icon.trim() && !isValidIconName(icon) && (
                  <p className="mt-1 text-[11px] text-red-500">
                    Nama ikon tidak dikenal — cari di https://lucide.dev/icons/
                  </p>
                )}
                {icon.trim() && isValidIconName(icon) && (
                  <p className="mt-1 text-[11px] text-gray-400">
                    Gunakan nama kebab-case dari{" "}
                    <a
                      href="https://lucide.dev/icons/"
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-500 underline"
                    >
                      lucide.dev/icons
                    </a>
                    , contoh: shower-head, wifi, parking-square.
                  </p>
                )}
                <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-6">
                  {QUICK_ICONS.map((q) => (
                    <button
                      key={q.name}
                      type="button"
                      title={q.label}
                      onClick={() => setIcon(q.name)}
                      className={`flex flex-col items-center gap-1 rounded-lg border p-2 transition-colors ${
                        icon === q.name
                          ? "border-brand-500 bg-brand-50 text-brand-600 dark:bg-brand-500/10"
                          : "border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:border-gray-700 dark:hover:text-gray-200"
                      }`}
                    >
                      <FacilityIcon name={q.name} className="h-4 w-4" />
                      <span className="text-[10px]">{q.label}</span>
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-[11px] text-gray-400">
                  Klik salah satu ikon cepat, atau ketik nama ikon lucide sendiri (kebab-case).
                </p>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  disabled={saving}
                  className="flex-1 rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving || !name.trim()}
                  className="flex-1 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50"
                >
                  {saving ? "Menyimpan..." : editing ? "Simpan Perubahan" : "Tambah Fasilitas"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toggle status confirmation */}
      <ConfirmDialog
        open={!!toggleTarget}
        title={toggleTarget?.status === "ACTIVE" ? "Nonaktifkan Fasilitas" : "Aktifkan Fasilitas"}
        message={
          toggleTarget?.status === "ACTIVE" ? (
            <>
              Nonaktifkan fasilitas{" "}
              <strong className="text-gray-800 dark:text-white/90">{toggleTarget?.name}</strong>? Fasilitas
              tidak akan muncul di form properti/unit type baru.
            </>
          ) : (
            <>
              Aktifkan kembali fasilitas{" "}
              <strong className="text-gray-800 dark:text-white/90">{toggleTarget?.name}</strong>?
            </>
          )
        }
        confirmLabel={toggleTarget?.status === "ACTIVE" ? "Nonaktifkan" : "Aktifkan"}
        variant={toggleTarget?.status === "ACTIVE" ? "danger" : "primary"}
        loading={toggling}
        onConfirm={handleToggle}
        onCancel={() => setToggleTarget(null)}
      />
    </div>
  );
}