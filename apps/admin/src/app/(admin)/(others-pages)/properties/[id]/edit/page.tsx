"use client";

import React, { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { $api } from "@/lib/api";
import PropertyForm from "@/components/property/PropertyForm";
import PropertyImages from "@/components/property/PropertyImages";

type Facility = { id: string; name: string };

type PropertyDetail = {
  id: string;
  name: string;
  code: string;
  slug: string;
  description: string | null;
  city: string;
  province: string | null;
  address: string | null;
  latitude?: string | number | null;
  longitude?: string | number | null;
  status: string;
  checkInTime: string;
  checkOutTime: string;
  timezone: string;
  propertyFacilities: Array<{ facility: Facility }>;
};

const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e));

export default function EditPropertyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [property, setProperty] = useState<PropertyDetail | null>(null);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      $api.get<PropertyDetail>(`/properties/${id}`),
      $api.get<Facility[]>("/facilities"),
    ])
      .then(([p, f]) => {
        setProperty(p);
        setFacilities(Array.isArray(f) ? f : []);
      })
      .catch((e) => setLoadError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

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
      await $api.patch(`/admin/properties/${id}`, {
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
      await $api.put(`/admin/properties/${id}/facilities`, { facilityIds: values.facilityIds });
      router.push(`/properties/${id}`);
    } catch (e) {
      setError(errMsg(e));
      setSubmitting(false);
    }
  };

  if (loading) return <div className="p-5 text-gray-500">Loading properti...</div>;
  if (loadError || !property) {
    return <div className="p-5 text-red-600">Error: {loadError || "Properti tidak ditemukan"}</div>;
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href={`/properties/${id}`} className="text-sm text-brand-500 hover:underline mb-1 inline-block">
            ← Kembali ke Detail Properti
          </Link>
          <h2 className="text-xl font-bold text-gray-800 dark:text-white/90">Edit Properti</h2>
          <p className="text-sm text-gray-500">{property.name}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${property.status === "ACTIVE" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}`}>
          {property.status}
        </span>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/30 dark:bg-red-900/10 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Gambar properti */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
        <PropertyImages propertyId={id} />
      </div>

      <PropertyForm
        mode="edit"
        initial={property}
        facilities={facilities}
        submitting={submitting}
        submitLabel="Simpan Perubahan"
        onSubmit={handleSubmit}
      />
    </div>
  );
}