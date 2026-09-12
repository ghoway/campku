"use client";

import React, { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { $api } from "@/lib/api";
import UnitTypeForm from "@/components/property/UnitTypeForm";

type Facility = { id: string; name: string };

type UnitTypeDetail = {
  id: string;
  name: string;
  description: string | null;
  capacity: number;
  weekdayPrice: string;
  weekendPrice: string;
  status: string;
  totalUnits: number;
  facilities?: Array<{ facility: Facility }>;
  property: { id: string; name: string } | null;
};

const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e));

export default function EditUnitTypePage({
  params,
}: {
  params: Promise<{ id: string; utId: string }>;
}) {
  const { id, utId } = use(params);
  const router = useRouter();
  const [unitType, setUnitType] = useState<UnitTypeDetail | null>(null);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const propertyLink = `/properties/${id ?? unitType?.property?.id}`;

  useEffect(() => {
    Promise.all([
      $api.get<UnitTypeDetail>(`/admin/unit-types/${utId}`),
      $api.get<Facility[]>("/facilities"),
    ])
      .then(([ut, f]) => {
        setUnitType(ut);
        setFacilities(Array.isArray(f) ? f : []);
      })
      .catch((e) => setLoadError(e.message))
      .finally(() => setLoading(false));
  }, [utId]);

  const handleSubmit = async (values: {
    name: string;
    description: string;
    capacity: string;
    weekdayPrice: string;
    weekendPrice: string;
    facilityIds: string[];
  }) => {
    setSubmitting(true);
    setError("");
    try {
      await $api.patch(`/admin/unit-types/${utId}`, {
        name: values.name,
        description: values.description || undefined,
        capacity: Number(values.capacity),
        weekdayPrice: Number(values.weekdayPrice),
        weekendPrice: Number(values.weekendPrice),
        facilityIds: values.facilityIds,
      });
      router.push(propertyLink);
    } catch (e) {
      setError(errMsg(e));
      setSubmitting(false);
    }
  };

  if (loading) return <div className="p-5 text-gray-500">Loading unit type...</div>;
  if (loadError || !unitType) {
    return <div className="p-5 text-red-600">Error: {loadError || "Unit type tidak ditemukan"}</div>;
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href={propertyLink} className="text-sm text-brand-500 hover:underline mb-1 inline-block">
            ← Kembali ke Detail Properti
          </Link>
          <h2 className="text-xl font-bold text-gray-800 dark:text-white/90">Edit Unit Type</h2>
          <p className="text-sm text-gray-500">
            {unitType.name} · {unitType.property?.name ?? ""}
          </p>
        </div>
        <Link
          href={`/properties/${id}/unit-types/${utId}/units`}
          className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          Kelola Unit ({unitType.totalUnits})
        </Link>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/30 dark:bg-red-900/10 dark:text-red-400">
          {error}
        </div>
      )}

      <UnitTypeForm
        initial={unitType}
        facilities={facilities}
        submitting={submitting}
        submitLabel="Simpan Perubahan"
        onSubmit={handleSubmit}
      />
    </div>
  );
}