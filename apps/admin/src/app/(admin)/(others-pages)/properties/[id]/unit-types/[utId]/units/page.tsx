"use client";

import React, { useEffect, useState, use } from "react";
import { $api } from "@/lib/api";
import Link from "next/link";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

type Unit = {
  id: string;
  unitTypeId: string;
  code: string;
  name: string | null;
  status: "AVAILABLE" | "MAINTENANCE" | "INACTIVE";
  notes: string | null;
};

const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e));

type UnitTypeDetail = {
  id: string;
  name: string;
  property: { id: string; name: string } | null;
};

const cardCls =
  "rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]";
const inputCls =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white";
const labelCls = "block text-xs text-gray-700 dark:text-gray-300 mb-1";

const statusBadge: Record<Unit["status"], string> = {
  AVAILABLE: "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300",
  MAINTENANCE: "bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300",
  INACTIVE: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
};

type UnitFormState = {
  code: string;
  name: string;
  status: Unit["status"];
  notes: string;
};

const emptyForm: UnitFormState = { code: "", name: "", status: "AVAILABLE", notes: "" };

export default function ManageUnitsPage({
  params,
}: {
  params: Promise<{ id: string; utId: string }>;
}) {
  const { id, utId } = use(params);
  const [unitType, setUnitType] = useState<UnitTypeDetail | null>(null);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<UnitFormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<UnitFormState>(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<Unit | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadData = () => {
    Promise.all([
      $api.get<UnitTypeDetail>(`/admin/unit-types/${utId}`),
      $api.get<Unit[]>(`/admin/unit-types/${utId}/units`),
    ])
      .then(([u, list]) => {
        setUnitType(u);
        setUnits(Array.isArray(list) ? list : []);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadData(); }, [utId]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.code) return;
    setSaving(true);
    try {
      await $api.post(`/admin/unit-types/${utId}/units`, {
        code: form.code,
        name: form.name || undefined,
        status: form.status,
        notes: form.notes || undefined,
      });
      setForm(emptyForm);
      loadData();
    } catch (e) {
      alert("Error: " + errMsg(e));
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (u: Unit) => {
    setEditingId(u.id);
    setEditForm({ code: u.code, name: u.name ?? "", status: u.status, notes: u.notes ?? "" });
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId || !editForm.code) return;
    setSaving(true);
    try {
      await $api.patch(`/admin/unit-types/${utId}/units/${editingId}`, {
        code: editForm.code,
        name: editForm.name || undefined,
        status: editForm.status,
        notes: editForm.notes || undefined,
      });
      setEditingId(null);
      loadData();
    } catch (e) {
      alert("Error: " + errMsg(e));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await $api.delete(`/admin/unit-types/${utId}/units/${deleteTarget.id}`);
      setDeleteTarget(null);
      loadData();
    } catch (e) {
      alert("Error: " + errMsg(e));
    } finally {
      setDeleting(false);
    }
  };

  const renderStatusSelect = (value: Unit["status"], onChange: (s: Unit["status"]) => void) => (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as Unit["status"])}
      className={inputCls}
    >
      <option value="AVAILABLE">AVAILABLE</option>
      <option value="MAINTENANCE">MAINTENANCE</option>
      <option value="INACTIVE">INACTIVE</option>
    </select>
  );

  if (loading) return <div className="p-5 text-gray-500">Loading unit...</div>;
  if (error) return <div className="p-5 text-red-600">Error: {error}</div>;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <Link href={`/properties/${id}`} className="text-sm text-brand-500 hover:underline mb-1 inline-block">
          ← Kembali ke Detail Properti
        </Link>
        <h2 className="text-xl font-bold text-gray-800 dark:text-white/90">
          Kelola Unit — {unitType?.name ?? ""}
        </h2>
        <p className="text-sm text-gray-500">
          {unitType?.property?.name} · {units.length} unit fisik
        </p>
      </div>

      {/* Add unit */}
      <div className={cardCls}>
        <h3 className="text-md font-semibold text-gray-800 dark:text-white/90 mb-4">Tambah Unit</h3>
        <form onSubmit={handleAdd} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className={labelCls}>Kode Unit *</label>
            <input
              type="text"
              required
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
              className={inputCls}
              placeholder="A1, B2..."
            />
          </div>
          <div>
            <label className={labelCls}>Nama</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className={inputCls}
              placeholder="Tenda Riverside 1"
            />
          </div>
          <div>
            <label className={labelCls}>Status</label>
            {renderStatusSelect(form.status, (s) => setForm({ ...form, status: s }))}
          </div>
          <div>
            <label className={labelCls}>Catatan</label>
            <input
              type="text"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className={inputCls}
              placeholder="opsional"
            />
          </div>
          <div className="sm:col-span-2 lg:col-span-4 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-brand-500 px-6 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50"
            >
              {saving ? "Menyimpan..." : "Tambah Unit"}
            </button>
          </div>
        </form>
      </div>

      {/* Unit list */}
      <div className={cardCls}>
        <h3 className="text-md font-semibold text-gray-800 dark:text-white/90 mb-4">
          Daftar Unit ({units.length})
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800 text-xs text-gray-500 uppercase text-left">
                <th className="py-2 pr-4">Kode</th>
                <th className="py-2 pr-4">Nama</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">Catatan</th>
                <th className="py-2 pr-4">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {units.map((u) =>
                editingId === u.id ? (
                  <tr key={u.id}>
                    <td className="py-3 pr-4">
                      <input
                        type="text"
                        required
                        value={editForm.code}
                        onChange={(e) => setEditForm({ ...editForm, code: e.target.value })}
                        className={inputCls}
                      />
                    </td>
                    <td className="py-3 pr-4">
                      <input
                        type="text"
                        value={editForm.name}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        className={inputCls}
                      />
                    </td>
                    <td className="py-3 pr-4">
                      {renderStatusSelect(editForm.status, (s) => setEditForm({ ...editForm, status: s }))}
                    </td>
                    <td className="py-3 pr-4">
                      <input
                        type="text"
                        value={editForm.notes}
                        onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                        className={inputCls}
                      />
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={handleUpdate}
                          disabled={saving}
                          className="text-sm font-medium text-brand-500 hover:text-brand-600 disabled:opacity-50"
                        >
                          Simpan
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="text-sm font-medium text-gray-500 hover:text-gray-700"
                        >
                          Batal
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr key={u.id}>
                    <td className="py-3 pr-4 font-medium text-gray-800 dark:text-white/90">{u.code}</td>
                    <td className="py-3 pr-4 text-gray-600 dark:text-gray-300">{u.name ?? "-"}</td>
                    <td className="py-3 pr-4">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge[u.status]}`}>
                        {u.status}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-gray-500">{u.notes ?? "-"}</td>
                    <td className="py-3 pr-4">
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={() => startEdit(u)}
                          className="text-sm font-medium text-blue-500 hover:text-blue-600"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(u)}
                          className="text-sm font-medium text-red-500 hover:text-red-600"
                        >
                          Hapus
                        </button>
                      </div>
                    </td>
                  </tr>
                ),
              )}
              {!units.length && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-sm text-gray-400">
                    Belum ada unit fisik. Tambah unit di atas untuk mulai alokasi.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Hapus Unit"
        message={
          <>
            Hapus unit <strong className="text-gray-800 dark:text-white/90">{deleteTarget?.code}</strong>? Unit
            yang punya riwayat booking tidak bisa dihapus.
          </>
        }
        confirmLabel="Hapus"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}