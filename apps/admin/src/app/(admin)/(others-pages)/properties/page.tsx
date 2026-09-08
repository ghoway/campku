"use client";

import React, { useEffect, useState } from "react";
import { $api } from "@/lib/api";

type Property = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  city: string;
  address: string;
  status: string;
  checkInTime: string;
  checkOutTime: string;
  unitTypes?: Array<{
    id: string;
    name: string;
    basePrice: string;
    capacity: number;
    totalUnits: number;
  }>;
};

export default function PropertiesPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);

  const loadProperties = () => {
    setLoading(true);
    $api
      .get<{ data: Property[] }>("/properties?limit=50")
      .then((res) => {
        setProperties(res.data);
        if (res.data.length > 0 && !selectedProperty) {
          loadPropertyDetail(res.data[0].id);
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  const loadPropertyDetail = (id: string) => {
    $api
      .get<{ data: Property }>(`/properties/${id}`)
      .then((res) => setSelectedProperty(res.data))
      .catch(console.error);
  };

  useEffect(() => {
    loadProperties();
  }, []);

  const fmtRp = (v: string | number) => "Rp" + Number(v).toLocaleString("id-ID");

  if (loading) return <div className="p-5 text-gray-500">Loading properti...</div>;

  return (
    <div className="grid grid-cols-12 gap-6">
      <div className="col-span-12">
        <h2 className="text-xl font-bold text-gray-800 dark:text-white/90">Properties & Unit Types</h2>
        <p className="text-sm text-gray-500">Daftar lokasi camping ground dan tipe unit tenda/cabin.</p>
      </div>

      <div className="col-span-12 md:col-span-4 space-y-3">
        {properties.map((p) => (
          <button
            key={p.id}
            onClick={() => loadPropertyDetail(p.id)}
            className={`w-full text-left p-4 rounded-xl border transition-all ${
              selectedProperty?.id === p.id
                ? "border-brand-500 bg-brand-50/20 dark:bg-brand-900/10"
                : "border-gray-200 bg-white hover:border-gray-300 dark:border-gray-800 dark:bg-white/[0.03]"
            }`}
          >
            <div className="flex justify-between items-start">
              <h3 className="font-semibold text-gray-800 dark:text-white/90">{p.name}</h3>
              <span className={`px-2 py-0.5 text-xs rounded-full ${p.status === "ACTIVE" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}`}>
                {p.status}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">{p.city}</p>
            <p className="text-xs text-gray-400 mt-2 line-clamp-1">{p.address}</p>
          </button>
        ))}
      </div>

      <div className="col-span-12 md:col-span-8">
        {selectedProperty ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03] space-y-6">
            <div>
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-bold text-gray-800 dark:text-white/90">{selectedProperty.name}</h3>
                <span className="text-xs text-gray-400">CheckIn: {selectedProperty.checkInTime} | CheckOut: {selectedProperty.checkOutTime}</span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">{selectedProperty.description}</p>
              <p className="text-xs text-gray-400 mt-2">Alamat: {selectedProperty.address}, {selectedProperty.city}</p>
            </div>

            <div>
              <h4 className="font-semibold text-gray-800 dark:text-white/90 mb-3 border-b border-gray-100 dark:border-gray-800 pb-2">
                Unit Types ({selectedProperty.unitTypes?.length ?? 0})
              </h4>
              <div className="space-y-3">
                {selectedProperty.unitTypes?.map((ut) => (
                  <div key={ut.id} className="p-4 rounded-xl border border-gray-100 dark:border-gray-800 flex justify-between items-center">
                    <div>
                      <h5 className="font-medium text-gray-800 dark:text-white/90">{ut.name}</h5>
                      <span className="text-xs text-gray-400">Kapasitas: {ut.capacity} orang | Total Unit: {ut.totalUnits}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-brand-600 dark:text-brand-400 text-base">{fmtRp(ut.basePrice)}</span>
                      <span className="block text-xs text-gray-400">/malam</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex h-full items-center justify-center p-8 rounded-2xl border border-gray-200 bg-white text-gray-400 text-sm">
            Pilih properti dari daftar di sebelah kiri untuk melihat detail.
          </div>
        )}
      </div>
    </div>
  );
}
