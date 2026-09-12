"use client";

import React, { useEffect, useState } from "react";
import { $api } from "@/lib/api";
import Link from "next/link";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

type Facility = { id: string; name: string };

type PropertyListItem = {
  id: string;
  name: string;
  slug: string;
  city: string;
  province: string | null;
  images: Array<{ id: string; url: string }>;
  facilities: Facility[];
  minPrice: string | null;
  maxCapacity: number | null;
};

const API = process.env.NEXT_PUBLIC_API_URL || "";
const IMG_BASE = (API || "").replace(/\/api\/v1\/?$/, "");

const fmtRp = (v: string | number | null) =>
  v == null ? "-" : "Rp" + Number(v).toLocaleString("id-ID");

const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e));

export default function PropertiesPage() {
  const [properties, setProperties] = useState<PropertyListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [confirmTarget, setConfirmTarget] = useState<PropertyListItem | null>(null);
  const [deactivating, setDeactivating] = useState(false);

  const loadAll = () => {
    $api
      .get<PropertyListItem[]>("/properties?limit=50")
      .then((p) => setProperties(Array.isArray(p) ? p : []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadAll(); }, []);

  const handleDeactivate = async () => {
    if (!confirmTarget) return;
    setDeactivating(true);
    try {
      await $api.patch(`/admin/properties/${confirmTarget.id}/deactivate`, {});
      setConfirmTarget(null);
      loadAll();
    } catch (e) {
      alert("Error: " + errMsg(e));
    } finally {
      setDeactivating(false);
    }
  };

  return (
    <div className="grid grid-cols-12 gap-6">
      <div className="col-span-12 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-gray-800 dark:text-white/90">Properties Management</h2>
          <p className="text-sm text-gray-500">Kelola properti camping ground, gambar, fasilitas, dan unit types.</p>
        </div>
        <Link
          href="/properties/new"
          className="rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
        >
          + Tambah Properti
        </Link>
      </div>

      <div className="col-span-12">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
          {loading && <p className="text-sm text-gray-500">Loading properti...</p>}
          {!loading && (
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
                          // eslint-disable-next-line @next/next/no-img-element
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
                        <Link
                          href={`/properties/${p.id}`}
                          className="font-medium text-gray-800 hover:text-brand-500 dark:text-white/90"
                        >
                          {p.name}
                        </Link>
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
                        <div className="flex gap-3">
                          <Link href={`/properties/${p.id}`} className="text-sm font-medium text-brand-500 hover:text-brand-600">
                            Detail
                          </Link>
                          <Link href={`/properties/${p.id}/edit`} className="text-sm font-medium text-blue-500 hover:text-blue-600">
                            Edit
                          </Link>
                          <button onClick={() => setConfirmTarget(p)} className="text-sm font-medium text-red-500 hover:text-red-600">
                            Nonaktif
                          </button>
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
      )}
      </div>

      <ConfirmDialog
        open={!!confirmTarget}
        title="Nonaktifkan Properti"
        message={
          <>
            Nonaktifkan properti{" "}
            <strong className="text-gray-800 dark:text-white/90">{confirmTarget?.name}</strong>? Properti
            tidak akan tampil untuk pemesanan baru.
          </>
        }
        confirmLabel="Nonaktifkan"
        loading={deactivating}
        onConfirm={handleDeactivate}
        onCancel={() => setConfirmTarget(null)}
      />
      </div>
    </div>
  );
}