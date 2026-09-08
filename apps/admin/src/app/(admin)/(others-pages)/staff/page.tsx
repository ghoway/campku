"use client";

import React, { useEffect, useState } from "react";
import { $api } from "@/lib/api";
import Link from "next/link";

type Staff = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  status: string;
  properties: Array<{ id: string; name: string }>;
};

type Property = { id: string; name: string };

export default function StaffPage() {
  const [staffs, setStaffs] = useState<Staff[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Staff | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [propertyIds, setPropertyIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const loadData = () => {
    setLoading(true);
    Promise.all([
      $api.get<Staff[]>("/admin/staff"),
      $api.get<Property[]>("/properties?limit=50"),
    ])
      .then(([s, p]) => {
        setStaffs(Array.isArray(s) ? s : []);
        setProperties(Array.isArray(p) ? p : []);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const resetForm = () => {
    setEditing(null);
    setName("");
    setEmail("");
    setPhone("");
    setPassword("");
    setPropertyIds([]);
  };

  const handleOpenEdit = (s: Staff) => {
    setEditing(s);
    setName(s.name);
    setEmail(s.email);
    setPhone(s.phone || "");
    setPropertyIds(s.properties?.map((p) => p.id) || []);
    setPassword("");
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editing) {
        await $api.patch(`/admin/staff/${editing.id}`, {
          name,
          phone: phone || undefined,
          propertyIds,
        });
        alert("Data staff berhasil diupdate!");
      } else {
        await $api.post("/admin/staff", {
          name,
          email,
          phone: phone || undefined,
          password,
          propertyIds,
        });
        alert("Staff baru berhasil dibuat!");
      }
      setShowModal(false);
      resetForm();
      loadData();
    } catch (e: any) {
      alert("Error: " + e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActivate = async (s: Staff) => {
    const action = s.status === "ACTIVE" ? "deactivate" : "activate";
    if (!confirm(`${action.toUpperCase()} staff ${s.name}?`)) return;
    try {
      await $api.post(`/admin/staff/${s.id}/${action}`, {});
      loadData();
    } catch (e: any) {
      alert("Error: " + e.message);
    }
  };

  const handlePropertyToggle = (id: string) => {
    setPropertyIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  if (loading) return <div className="p-5 text-gray-500">Loading staff data...</div>;

  return (
    <div className="grid grid-cols-12 gap-6">
      <div className="col-span-12 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-gray-800 dark:text-white/90">Staff Management</h2>
          <p className="text-sm text-gray-500">Kelola akun staff operasional per properti.</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
        >
          + Tambah Staff
        </button>
      </div>

      <div className="col-span-12">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800 text-xs text-gray-500 uppercase">
                  <th className="py-3 px-4 text-left">Nama</th>
                  <th className="py-3 px-4 text-left">Kontak</th>
                  <th className="py-3 px-4 text-left">Properti Ditugaskan</th>
                  <th className="py-3 px-4 text-left">Status</th>
                  <th className="py-3 px-4 text-left">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-sm">
                {(staffs || []).map((s) => (
                  <tr key={s.id}>
                    <td className="py-3 px-4 font-medium text-gray-800 dark:text-white/90">{s.name}</td>
                    <td className="py-3 px-4 text-gray-600 dark:text-gray-300">
                      {s.email}
                      <br />
                      <span className="text-xs text-gray-400">{s.phone ?? "-"}</span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1">
                        {s.properties?.map((p) => (
                          <span key={p.id} className="px-2 py-0.5 text-xs rounded bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300">
                            {p.name}
                          </span>
                        ))}
                        {!s.properties?.length && <span className="text-xs text-gray-400">-</span>}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2.5 py-0.5 text-xs rounded-full font-medium ${s.status === "ACTIVE" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-500"}`}>
                        {s.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleOpenEdit(s)}
                          className="text-sm font-medium text-brand-500 hover:text-brand-600"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleToggleActivate(s)}
                          className={`text-sm font-medium ${s.status === "ACTIVE" ? "text-red-500 hover:text-red-600" : "text-green-500 hover:text-green-600"}`}
                        >
                          {s.status === "ACTIVE" ? "Deactivate" : "Activate"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!staffs.length && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-sm text-gray-400">
                      Belum ada staff.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal Tambah/Edit Staff */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900">
            <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">
              {editing ? "Edit Staff" : "Tambah Staff Baru"}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-3 text-sm">
              <div>
                <label className="block text-gray-700 dark:text-gray-300 mb-1">Nama Lengkap *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-gray-700 dark:text-gray-300 mb-1">Email *</label>
                <input
                  type="email"
                  required
                  disabled={!!editing}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 disabled:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:disabled:bg-gray-800"
                />
              </div>
              <div>
                <label className="block text-gray-700 dark:text-gray-300 mb-1">Nomor HP</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </div>
              {!editing && (
                <div>
                  <label className="block text-gray-700 dark:text-gray-300 mb-1">Password Awal *</label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  />
                </div>
              )}
              <div>
                <label className="block text-gray-700 dark:text-gray-300 mb-1">Assign ke Properti</label>
                <div className="space-y-2 max-h-32 overflow-y-auto border border-gray-200 rounded-lg p-2 dark:border-gray-700">
                  {properties.map((p) => (
                    <label key={p.id} className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                      <input
                        type="checkbox"
                        checked={propertyIds.includes(p.id)}
                        onChange={() => handlePropertyToggle(p.id)}
                        className="rounded border-gray-300"
                      />
                      <span className="text-sm">{p.name}</span>
                    </label>
                  ))}
                </div>
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
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
