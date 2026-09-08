"use client";

import React, { useEffect, useState, useRef } from "react";
import { $api } from "@/lib/api";

type Facility = { id: string; name: string };

type UnitType = {
  id: string;
  name: string;
  description: string | null;
  capacity: number;
  weekdayPrice: string;
  weekendPrice: string;
  totalUnits: number;
  status: string;
  images?: Array<{ id: string; url: string }>;
};

type PropertyImage = {
  id: string;
  url: string;
  originalFilename: string;
  sortOrder: number;
  isPrimary: boolean;
};

type PropertyListItem = {
  id: string;
  name: string;
  slug: string;
  city: string;
  province: string | null;
  description: string | null;
  images: Array<{ id: string; url: string }>;
  facilities: Facility[];
  minPrice: string | null;
  maxCapacity: number | null;
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
  status: string;
  checkInTime: string;
  checkOutTime: string;
  timezone: string;
  images: PropertyImage[];
  propertyFacilities: Array<{ facility: Facility }>;
  unitTypes: UnitType[];
};

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1";
const IMG_BASE = (API || "").replace("/api/v1", "");

export default function PropertiesPage() {
  const [properties, setProperties] = useState<PropertyListItem[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<PropertyDetail | null>(null);
  const [detail, setDetail] = useState<PropertyDetail | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [city, setCity] = useState("");
  const [province, setProvince] = useState("");
  const [address, setAddress] = useState("");
  const [checkInTime, setCheckInTime] = useState("14:00");
  const [checkOutTime, setCheckOutTime] = useState("12:00");
  const [timezone, setTimezone] = useState("Asia/Jakarta");
  const [facilityIds, setFacilityIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const loadAll = () => {
    setLoading(true);
    Promise.all([
      $api.get<{ data: PropertyListItem[] }>("/properties?limit=50"),
      $api.get<{ data: Facility[] }>("/facilities"),
    ])
      .then(([p, f]) => {
        setProperties(Array.isArray(p.data) ? p.data : []);
        setFacilities(Array.isArray(f.data) ? f.data : []);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadAll(); }, []);

  const fetchDetail = async (id: string): Promise<PropertyDetail | null> => {
    try {
      const res = await $api.get<PropertyDetail>(`/properties/${id}`);
      return res as unknown as PropertyDetail;
    } catch (e: any) {
      alert("Error: " + e.message);
      return null;
    }
  };

  const resetForm = () => {
    setEditing(null);
    setName("");
    setCode("");
    setDescription("");
    setCity("");
    setProvince("");
    setAddress("");
    setCheckInTime("14:00");
    setCheckOutTime("12:00");
    setTimezone("Asia/Jakarta");
    setFacilityIds([]);
  };

  const openCreate = () => {
    resetForm();
    setShowModal(true);
  };

  const openEdit = async (id: string) => {
    const d = await fetchDetail(id);
    if (!d) return;
    setEditing(d);
    setName(d.name);
    setCode(d.code);
    setDescription(d.description || "");
    setCity(d.city);
    setProvince(d.province || "");
    setAddress(d.address || "");
    setCheckInTime(d.checkInTime);
    setCheckOutTime(d.checkOutTime);
    setTimezone(d.timezone);
    setFacilityIds(d.propertyFacilities?.map((pf) => pf.facility.id) || []);
    setShowModal(true);
  };

  const openDetail = async (id: string) => {
    const d = await fetchDetail(id);
    if (d) setDetail(d);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !code || !city) return;
    setSubmitting(true);
    try {
      if (editing) {
        await $api.patch(`/admin/properties/${editing.id}`, {
          name,
          description: description || undefined,
          city,
          province: province || undefined,
          address: address || undefined,
          checkInTime,
          checkOutTime,
          timezone,
        });
        await $api.put(`/admin/properties/${editing.id}/facilities`, {
          facilityIds,
        });
        alert("Properti berhasil diupdate!");
      } else {
        await $api.post("/admin/properties", {
          name,
          code,
          description: description || undefined,
          city,
          province: province || undefined,
          address: address || undefined,
          checkInTime,
          checkOutTime,
          timezone,
        });
        alert("Properti baru berhasil dibuat!");
      }
      setShowModal(false);
      resetForm();
      loadAll();
    } catch (e: any) {
      alert("Error: " + e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeactivate = async (id: string) => {
    if (!confirm("Nonaktifkan properti ini?")) return;
    try {
      await $api.patch(`/admin/properties/${id}/deactivate`, {});
      loadAll();
    } catch (e: any) {
      alert("Error: " + e.message);
    }
  };

  const handleUploadImage = async (propertyId: string, file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
      const res = await fetch(`${API}/admin/properties/${propertyId}/images`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error?.message || "Upload failed");
      }
      alert("Gambar berhasil diupload!");
      // Refresh detail
      const d = await fetchDetail(propertyId);
      if (d) setDetail(d);
    } catch (e: any) {
      alert("Upload error: " + e.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteImage = async (propertyId: string, imageId: string) => {
    if (!confirm("Hapus gambar ini?")) return;
    try {
      await $api.delete(`/admin/properties/${propertyId}/images/${imageId}`);
      const d = await fetchDetail(propertyId);
      if (d) setDetail(d);
    } catch (e: any) {
      alert("Error: " + e.message);
    }
  };

  const toggleFacility = (id: string) => {
    setFacilityIds((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]
    );
  };

  const fmtRp = (v: string | number | null) =>
    v == null ? "-" : "Rp" + Number(v).toLocaleString("id-ID");

  if (loading) return <div className="p-5 text-gray-500">Loading properti...</div>;

  return (
    <div className="grid grid-cols-12 gap-6">
      <div className="col-span-12 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-gray-800 dark:text-white/90">Properties Management</h2>
          <p className="text-sm text-gray-500">Kelola properti camping ground, gambar, fasilitas, dan unit types.</p>
        </div>
        <button onClick={openCreate}
          className="rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600">
          + Tambah Properti
        </button>
      </div>

      {/* List */}
      <div className="col-span-12">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800 text-xs text-gray-500 uppercase">
                  <th className="py-3 px-4 text-left">Gambar</th>
                  <th className="py-3 px-4 text-left">Nama</th>
                  <th className="py-3 px-4 text-left">Kota</th>
                  <th className="py-3 px-4 text-left">Harga Mulai</th>
                  <th className="py-3 px-4 text-left">Kapasitas Max</th>
                  <th className="py-3 px-4 text-left">Fasilitas</th>
                  <th className="py-3 px-4 text-left">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-sm">
                {(properties || []).map((p) => (
                  <tr key={p.id}>
                    <td className="py-3 px-4">
                      {p.images?.length > 0 ? (
                        <img
                          src={`${IMG_BASE}${p.images[0].url}`}
                          alt={p.name}
                          className="h-12 w-16 object-cover rounded-lg"
                        />
                      ) : (
                        <div className="h-12 w-16 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-xs text-gray-400">
                          No img
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-gray-800 dark:text-white/90">{p.name}</div>
                      <div className="text-xs text-gray-400">{p.slug}</div>
                    </td>
                    <td className="py-3 px-4 text-gray-600 dark:text-gray-300">
                      {p.city}{p.province ? `, ${p.province}` : ""}
                    </td>
                    <td className="py-3 px-4 font-semibold text-brand-600">{fmtRp(p.minPrice)}</td>
                    <td className="py-3 px-4 text-gray-600 dark:text-gray-300">{p.maxCapacity ?? "-"} org</td>
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1">
                        {(p.facilities || []).slice(0, 3).map((f) => (
                          <span key={f.id} className="px-1.5 py-0.5 text-[10px] rounded bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300">
                            {f.name}
                          </span>
                        ))}
                        {(p.facilities?.length || 0) > 3 && (
                          <span className="px-1.5 py-0.5 text-[10px] rounded bg-gray-100 text-gray-500">+{(p.facilities?.length || 0) - 3}</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2">
                        <button onClick={() => openDetail(p.id)} className="text-sm font-medium text-brand-500 hover:text-brand-600">Detail</button>
                        <button onClick={() => openEdit(p.id)} className="text-sm font-medium text-blue-500 hover:text-blue-600">Edit</button>
                        <button onClick={() => handleDeactivate(p.id)} className="text-sm font-medium text-red-500 hover:text-red-600">Nonaktif</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!properties?.length && (
                  <tr><td colSpan={7} className="py-8 text-center text-sm text-gray-400">Belum ada properti.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal Create/Edit */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">
              {editing ? "Edit Properti" : "Tambah Properti Baru"}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-700 dark:text-gray-300 mb-1">Kode *</label>
                  <input type="text" required disabled={!!editing} value={code} onChange={(e) => setCode(e.target.value.toUpperCase())}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 uppercase dark:border-gray-700 dark:bg-gray-800 dark:text-white disabled:bg-gray-100" placeholder="PKC" />
                </div>
                <div>
                  <label className="block text-gray-700 dark:text-gray-300 mb-1">Nama *</label>
                  <input type="text" required value={name} onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-800 dark:text-white" />
                </div>
              </div>
              <div>
                <label className="block text-gray-700 dark:text-gray-300 mb-1">Deskripsi</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-800 dark:text-white" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-700 dark:text-gray-300 mb-1">Kota *</label>
                  <input type="text" required value={city} onChange={(e) => setCity(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-800 dark:text-white" />
                </div>
                <div>
                  <label className="block text-gray-700 dark:text-gray-300 mb-1">Provinsi</label>
                  <input type="text" value={province} onChange={(e) => setProvince(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-800 dark:text-white" />
                </div>
              </div>
              <div>
                <label className="block text-gray-700 dark:text-gray-300 mb-1">Alamat</label>
                <input type="text" value={address} onChange={(e) => setAddress(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-800 dark:text-white" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-gray-700 dark:text-gray-300 mb-1">Check-in</label>
                  <input type="time" value={checkInTime} onChange={(e) => setCheckInTime(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-800 dark:text-white" />
                </div>
                <div>
                  <label className="block text-gray-700 dark:text-gray-300 mb-1">Check-out</label>
                  <input type="time" value={checkOutTime} onChange={(e) => setCheckOutTime(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-800 dark:text-white" />
                </div>
                <div>
                  <label className="block text-gray-700 dark:text-gray-300 mb-1">Timezone</label>
                  <input type="text" value={timezone} onChange={(e) => setTimezone(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-800 dark:text-white" />
                </div>
              </div>
              <div>
                <label className="block text-gray-700 dark:text-gray-300 mb-1">Fasilitas Properti</label>
                <div className="space-y-2 max-h-32 overflow-y-auto border border-gray-200 rounded-lg p-2 dark:border-gray-700">
                  {(facilities || []).map((f) => (
                    <label key={f.id} className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                      <input type="checkbox" checked={facilityIds.includes(f.id)} onChange={() => toggleFacility(f.id)} className="rounded border-gray-300" />
                      <span className="text-sm">{f.name}</span>
                    </label>
                  ))}
                  {!facilities?.length && <p className="text-xs text-gray-400">Belum ada fasilitas.</p>}
                </div>
              </div>
              <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-800">
                <button type="button" onClick={() => setShowModal(false)}
                  className="w-1/2 rounded-xl border border-gray-300 px-4 py-2 font-medium text-gray-700 dark:border-gray-700 dark:text-gray-300">Batal</button>
                <button type="submit" disabled={submitting}
                  className="w-1/2 rounded-xl bg-brand-500 px-4 py-2 font-semibold text-white hover:bg-brand-600 disabled:opacity-50">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Detail */}
      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-bold text-gray-800 dark:text-white">{detail.name}</h3>
              <button onClick={() => setDetail(null)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
            </div>

            <div className="space-y-4 text-sm">
              {/* Info Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-gray-400 block text-xs">Kode</span>
                  <span className="font-medium text-gray-800 dark:text-white/90">{detail.code}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-xs">Kota</span>
                  <span className="font-medium text-gray-800 dark:text-white/90">{detail.city}{detail.province ? `, ${detail.province}` : ""}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-xs">Check-in / Check-out</span>
                  <span className="font-medium text-gray-800 dark:text-white/90">{detail.checkInTime} / {detail.checkOutTime}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-xs">Timezone</span>
                  <span className="font-medium text-gray-800 dark:text-white/90">{detail.timezone}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-xs">Status</span>
                  <span className={`font-medium ${detail.status === "ACTIVE" ? "text-green-600" : "text-gray-500"}`}>{detail.status}</span>
                </div>
              </div>

              {detail.address && (
                <div>
                  <span className="text-gray-400 block text-xs">Alamat</span>
                  <span className="text-gray-700 dark:text-gray-300">{detail.address}</span>
                </div>
              )}
              {detail.description && (
                <div>
                  <span className="text-gray-400 block text-xs">Deskripsi</span>
                  <p className="text-gray-700 dark:text-gray-300">{detail.description}</p>
                </div>
              )}

              {/* Fasilitas */}
              {detail.propertyFacilities && detail.propertyFacilities.length > 0 && (
                <div>
                  <span className="text-gray-400 block text-xs mb-1">Fasilitas</span>
                  <div className="flex flex-wrap gap-1">
                    {detail.propertyFacilities.map((pf) => (
                      <span key={pf.facility.id} className="px-2 py-0.5 text-xs rounded bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300">
                        {pf.facility.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Gambar Properti + Upload */}
              <div className="border-t border-gray-200 dark:border-gray-800 pt-4">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-semibold text-gray-800 dark:text-white/90">
                    Gambar ({detail.images?.length ?? 0})
                  </h4>
                  <div>
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleUploadImage(detail.id, file);
                        e.target.value = "";
                      }}
                    />
                    <button
                      type="button"
                      disabled={uploading}
                      onClick={() => fileRef.current?.click()}
                      className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 disabled:opacity-50"
                    >
                      {uploading ? "Uploading..." : "+ Upload Gambar"}
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {(detail.images || []).map((img) => (
                    <div key={img.id} className="relative group rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                      <img
                        src={`${IMG_BASE}${img.url}`}
                        alt={img.originalFilename}
                        className="h-28 w-full object-cover"
                      />
                      {img.isPrimary && (
                        <span className="absolute top-1 left-1 px-1.5 py-0.5 text-[10px] rounded bg-brand-500 text-white font-medium">
                          Primary
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDeleteImage(detail.id, img.id)}
                        className="absolute top-1 right-1 h-6 w-6 rounded-full bg-red-500 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        &times;
                      </button>
                    </div>
                  ))}
                  {!detail.images?.length && (
                    <div className="col-span-3 py-4 text-center text-xs text-gray-400">
                      Belum ada gambar. Klik "Upload Gambar" untuk menambah.
                    </div>
                  )}
                </div>
              </div>

              {/* Unit Types */}
              <div className="border-t border-gray-200 dark:border-gray-800 pt-4">
                <h4 className="font-semibold text-gray-800 dark:text-white/90 mb-2">
                  Unit Types ({detail.unitTypes?.length ?? 0})
                </h4>
                <div className="space-y-2">
                  {(detail.unitTypes || []).map((ut) => (
                    <div key={ut.id} className="p-3 rounded-lg border border-gray-100 dark:border-gray-800 flex justify-between items-center">
                      <div>
                        <h5 className="font-medium text-gray-800 dark:text-white/90">{ut.name}</h5>
                        <span className="text-xs text-gray-400">
                          Kapasitas: {ut.capacity} | Unit: {ut.totalUnits} | {ut.status}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-brand-600 dark:text-brand-400">{fmtRp(ut.weekdayPrice)}</span>
                        <span className="block text-xs text-gray-400">weekday / {fmtRp(ut.weekendPrice)} weekend</span>
                      </div>
                    </div>
                  ))}
                  {!detail.unitTypes?.length && <p className="text-sm text-gray-400">Belum ada unit type.</p>}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
