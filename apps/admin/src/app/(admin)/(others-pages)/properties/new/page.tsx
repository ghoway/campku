"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { $api } from "@/lib/api";
import PropertyForm from "@/components/property/PropertyForm";

type Facility = { id: string; name: string };

const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e));

export default function NewPropertyPage() {
  const router = useRouter();
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loadError, setLoadError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    $api
      .get<Facility[]>("/facilities")
      .then((f) => setFacilities(Array.isArray(f) ? f : []))
      .catch((e) => setLoadError(e.message));
  }, []);

  const handleSubmit = async (values: {
    code: string;
    name: string;
    description: string;
    city: string;
    province: string;
    address: string;
    latitude?: string;
    longitude?: string;
    checkInTime: string;
    checkOutTime: string;
    timezone: string;
    facilityIds: string[];
  }) => {
    setSubmitting(true);
    setError("");
    try {
      const created = await $api.post<{ id: string }>("/admin/properties", {
        code: values.code,
        name: values.name,
        description: values.description || undefined,
        city: values.city,
        province: values.province || undefined,
        address: values.address || undefined,
        latitude: values.latitude ? Number(values.latitude) : undefined,
        longitude: values.longitude ? Number(values.longitude) : undefined,
        checkInTime: values.checkInTime,
        checkOutTime: values.checkOutTime,
        timezone: values.timezone,
      });
      if (values.facilityIds.length) {
        await $api.put(`/admin/properties/${created.id}/facilities`, {
          facilityIds: values.facilityIds,
        });
      }
      router.push(`/properties/${created.id}`);
    } catch (e) {
      setError(errMsg(e));
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <Link href="/properties" className="text-sm text-brand-500 hover:underline mb-1 inline-block">
          ← Kembali ke Properties
        </Link>
        <h2 className="text-xl font-bold text-gray-800 dark:text-white/90">Tambah Properti Baru</h2>
        <p className="text-sm text-gray-500">Lengkapi informasi dasar properti camping ground baru.</p>
      </div>

      {loadError && <p className="text-sm text-red-600">Error: {loadError}</p>}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/30 dark:bg-red-900/10 dark:text-red-400">
          {error}
        </div>
      )}

      <PropertyForm
        mode="create"
        facilities={facilities}
        submitting={submitting}
        submitLabel="Simpan Properti"
        onSubmit={handleSubmit}
      />
    </div>
  );
}