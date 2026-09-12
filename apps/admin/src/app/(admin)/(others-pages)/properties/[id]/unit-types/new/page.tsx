"use client";

import React, { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { $api } from "@/lib/api";
import UnitTypeForm from "@/components/property/UnitTypeForm";

type Facility = { id: string; name: string };

const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e));

export default function NewUnitTypePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [propertyName, setPropertyName] = useState("");
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      $api.get<{ name: string }>(`/properties/${id}`),
      $api.get<Facility[]>("/facilities"),
    ])
      .then(([p, f]) => {
        setPropertyName(p.name);
        setFacilities(Array.isArray(f) ? f : []);
      })
      .catch(() => {});
  }, [id]);

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
      await $api.post(`/admin/properties/${id}/unit-types`, {
        name: values.name,
        description: values.description || undefined,
        capacity: Number(values.capacity),
        weekdayPrice: Number(values.weekdayPrice),
        weekendPrice: Number(values.weekendPrice),
        facilityIds: values.facilityIds,
      });
      router.push(`/properties/${id}`);
    } catch (e) {
      setError(errMsg(e));
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <Link href={`/properties/${id}`} className="text-sm text-brand-500 hover:underline mb-1 inline-block">
          ← Kembali ke Detail Properti
        </Link>
        <h2 className="text-xl font-bold text-gray-800 dark:text-white/90">
          Tambah Unit Type {propertyName ? `- ${propertyName}` : ""}
        </h2>
        <p className="text-sm text-gray-500">Unit type mewakili kategori unit yang dijual (tenda, cabin, dsb).</p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/30 dark:bg-red-900/10 dark:text-red-400">
          {error}
        </div>
      )}

      <UnitTypeForm
        facilities={facilities}
        submitting={submitting}
        submitLabel="Simpan Unit Type"
        onSubmit={handleSubmit}
      />
    </div>
  );
}