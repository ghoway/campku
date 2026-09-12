"use client";

import React, { useEffect, useState, use } from "react";
import { $api } from "@/lib/api";
import Link from "next/link";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import PropertyImages from "@/components/property/PropertyImages";

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
  propertyFacilities: Array<{ facility: Facility }>;
  unitTypes: UnitType[];
};

const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e));
const fmtRp = (v: string | number | null) =>
  v == null ? "-" : "Rp" + Number(v).toLocaleString("id-ID");

export default function PropertyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [property, setProperty] = useState<PropertyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Modal states
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);
  const [deactivating, setDeactivating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<UnitType | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadData = () => {
    $api
      .get<PropertyDetail>(`/properties/${id}`)
      .then(setProperty)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadData(); }, [id]);

  const handleDeactivate = async () => {
    setDeactivating(true);
    try {
      await $api.patch(`/admin/properties/${id}/deactivate`, {});
      setConfirmDeactivate(false);
      loadData();
    } catch (e) {
      alert("Error: " + errMsg(e));
    } finally {
      setDeactivating(false);
    }
  };

  const handleDeleteUnitType = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await $api.delete(`/admin/unit-types/${deleteTarget.id}`);
      setDeleteTarget(null);
      loadData();
    } catch (e) {
      alert("Error: " + errMsg(e));
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return <div className="p-5 text-gray-500">Loading properti...</div>;
  if (error || !property) {
    return <div className="p-5 text-red-600">Error: {error || "Properti tidak ditemukan"}</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/properties" className="text-sm text-brand-500 hover:underline mb-1 inline-block">
          ← Kembali ke Properties
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white/90">{property.name}</h2>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${property.status === "ACTIVE" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}`}>
              {property.status}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/properties/${property.id}/edit`}
              className="rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
            >
              Edit Properti
            </Link>
            <Link
              href={`/properties/${property.id}/unit-types/new`}
              className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              + Tambah Unit Type
            </Link>
            <button
              onClick={() => setConfirmDeactivate(true)}
              disabled={property.status !== "ACTIVE"}
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed dark:border-red-900/30 dark:bg-red-900/10 dark:text-red-400"
            >
              Nonaktifkan
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Left column: info, facilities, images */}
        <div className="col-span-12 lg:col-span-8 space-y-6">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
            <h3 className="text-md font-semibold text-gray-800 dark:text-white/90 mb-4">Informasi Properti</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-400 block text-xs">Kode</span>
                <span className="font-medium text-gray-800 dark:text-white/90">{property.code}</span>
              </div>
              <div>
                <span className="text-gray-400 block text-xs">Slug</span>
                <span className="text-gray-700 dark:text-gray-300">{property.slug}</span>
              </div>
              <div>
                <span className="text-gray-400 block text-xs">Kota</span>
                <span className="font-medium text-gray-800 dark:text-white/90">
                  {property.city}{property.province ? `, ${property.province}` : ""}
                </span>
              </div>
              <div>
                <span className="text-gray-400 block text-xs">Check-in / Check-out</span>
                <span className="text-gray-700 dark:text-gray-300">{property.checkInTime} / {property.checkOutTime}</span>
              </div>
              <div>
                <span className="text-gray-400 block text-xs">Timezone</span>
                <span className="text-gray-700 dark:text-gray-300">{property.timezone}</span>
              </div>
              <div>
                <span className="text-gray-400 block text-xs">Status</span>
                <span className={`font-medium ${property.status === "ACTIVE" ? "text-green-600" : "text-gray-500"}`}>{property.status}</span>
              </div>
            </div>
            {property.address && (
              <div className="mt-4">
                <span className="text-gray-400 block text-xs">Alamat</span>
                <span className="text-gray-700 dark:text-gray-300">{property.address}</span>
              </div>
            )}
            {property.description && (
              <div className="mt-4">
                <span className="text-gray-400 block text-xs">Deskripsi</span>
                <p className="text-gray-700 dark:text-gray-300">{property.description}</p>
              </div>
            )}
          </div>

          {/* Facilities */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
            <h3 className="text-md font-semibold text-gray-800 dark:text-white/90 mb-4">Fasilitas Properti</h3>
            {property.propertyFacilities?.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {property.propertyFacilities.map((pf) => (
                  <span key={pf.facility.id} className="px-3 py-1 text-sm rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300">
                    {pf.facility.name}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">Belum ada fasilitas. Edit properti untuk menambahkan.</p>
            )}
          </div>

          {/* Images */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
            <PropertyImages propertyId={id} />
          </div>
        </div>

        {/* Right column: unit types */}
        <div className="col-span-12 lg:col-span-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
            <h3 className="text-md font-semibold text-gray-800 dark:text-white/90 mb-4">
              Unit Types ({property.unitTypes?.length ?? 0})
            </h3>
            <div className="space-y-3">
              {(property.unitTypes || []).map((ut) => (
                <div key={ut.id} className="p-3 rounded-lg border border-gray-100 dark:border-gray-800 text-sm">
                  <div className="flex justify-between items-start">
                    <div>
                      <h5 className="font-medium text-gray-800 dark:text-white/90">{ut.name}</h5>
                      <span className="text-xs text-gray-400">
                        Kapasitas: {ut.capacity} org · Unit: {ut.totalUnits} · {ut.status}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-brand-600 dark:text-brand-400">{fmtRp(ut.weekdayPrice)}</span>
                      <span className="block text-[10px] text-gray-400">weekday / {fmtRp(ut.weekendPrice)} weekend</span>
                    </div>
                  </div>
                  <div className="flex gap-3 mt-2 pt-2 border-t border-gray-50 dark:border-gray-800/50">
                    <Link
                      href={`/properties/${property.id}/unit-types/${ut.id}/edit`}
                      className="text-xs font-medium text-brand-500 hover:text-brand-600"
                    >
                      Edit
                    </Link>
                    <Link
                      href={`/properties/${property.id}/unit-types/${ut.id}/units`}
                      className="text-xs font-medium text-blue-500 hover:text-blue-600"
                    >
                      Kelola Unit
                    </Link>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(ut)}
                      className="text-xs font-medium text-red-500 hover:text-red-600"
                    >
                      Hapus
                    </button>
                  </div>
                </div>
              ))}
              {!property.unitTypes?.length && (
                <p className="text-sm text-gray-400">Belum ada unit type. Tambah dulu untuk mulai jual.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Nonaktifkan property confirmation */}
      <ConfirmDialog
        open={confirmDeactivate}
        title="Nonaktifkan Properti"
        message={
          <>
            Properti <strong className="text-gray-800 dark:text-white/90">{property.name}</strong> tidak akan
            lagi tampil untuk pemesanan baru. Properti tetap tersimpan dan bisa diaktifkan kembali.
          </>
        }
        confirmLabel="Nonaktifkan"
        loading={deactivating}
        onConfirm={handleDeactivate}
        onCancel={() => setConfirmDeactivate(false)}
      />

      {/* Delete unit type confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Hapus Unit Type"
        message={
          <>
            Hapus unit type <strong className="text-gray-800 dark:text-white/90">{deleteTarget?.name}</strong>?
            Unit di dalamnya ikut terhapus dan tidak bisa dikembalikan.
          </>
        }
        confirmLabel="Hapus"
        loading={deleting}
        onConfirm={handleDeleteUnitType}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}