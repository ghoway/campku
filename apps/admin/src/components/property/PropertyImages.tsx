"use client";

import React, { useEffect, useRef, useState } from "react";
import { $api, getAuthToken } from "@/lib/api";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

const API = process.env.NEXT_PUBLIC_API_URL || "";
const IMG_BASE = (API || "").replace(/\/api\/v1\/?$/, "");

type PropertyImage = {
  id: string;
  url: string;
  originalFilename: string;
  sortOrder: number;
  isPrimary: boolean;
};

export default function PropertyImages({
  propertyId,
  onChanged,
}: {
  propertyId: string;
  onChanged?: () => void;
}) {
  const [images, setImages] = useState<PropertyImage[]>([]);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<PropertyImage | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const loadImages = () => {
    $api
      .get<{ images: PropertyImage[] }>(`/properties/${propertyId}`)
      .then((p) => setImages(Array.isArray(p.images) ? p.images : []))
      .catch(() => {});
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadImages(); }, [propertyId]);

  const handleUploadImage = async (file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`${API}/admin/properties/${propertyId}/images`, {
        method: "POST",
        headers: { Authorization: `Bearer ${getAuthToken() ?? ""}` },
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error?.message || "Upload failed");
      }
      loadImages();
      onChanged?.();
    } catch (e) {
      alert("Upload error: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setUploading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleting) return;
    try {
      await $api.delete(`/admin/properties/${propertyId}/images/${deleting.id}`);
      setDeleting(null);
      loadImages();
      onChanged?.();
    } catch (e) {
      alert("Error: " + (e instanceof Error ? e.message : String(e)));
    }
  };

  return (
    <div>
      <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
        <h3 className="text-md font-semibold text-gray-800 dark:text-white/90">
          Gambar Properti ({images.length})
        </h3>
        <div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleUploadImage(file);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
            className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-50 dark:bg-gray-800 dark:text-gray-300"
          >
            {uploading ? "Uploading..." : "+ Upload Gambar"}
          </button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {images.map((img) => (
          <div
            key={img.id}
            className="relative group rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
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
              onClick={() => setDeleting(img)}
              className="absolute top-1 right-1 h-6 w-6 rounded-full bg-red-500 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label="Hapus gambar"
            >
              &times;
            </button>
          </div>
        ))}
        {!images.length && (
          <div className="col-span-full py-4 text-center text-xs text-gray-400">
            Belum ada gambar. Klik &quot;Upload Gambar&quot; untuk menambah.
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!deleting}
        title="Hapus Gambar"
        message={`Hapus gambar "${deleting?.originalFilename}"?`}
        confirmLabel="Hapus"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}