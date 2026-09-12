"use client";

import React, { useEffect, useState } from "react";
import { $api } from "@/lib/api";

type Review = {
  id: string;
  rating: number;
  comment: string;
  status: "PENDING" | "APPROVED" | "HIDDEN";
  createdAt: string;
  user: { id: string; name: string; email: string };
  property: { id: string; name: string };
  booking: { id: string; bookingCode: string };
};

const statusColors: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  APPROVED: "bg-green-100 text-green-800",
  HIDDEN: "bg-gray-200 text-gray-600",
};

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    const qs = filterStatus ? `?status=${filterStatus}` : "";
    $api.get<Review[]>(`/admin/reviews${qs}`)
      .then(setReviews)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [filterStatus]);

  const updateStatus = async (id: string, status: string) => {
    setActionLoading(id);
    try {
      await $api.patch(`/admin/reviews/${id}`, { status });
      load();
    } catch (e: any) {
      alert("Error: " + e.message);
    } finally {
      setActionLoading(null);
    }
  };

  const deleteReview = async (id: string) => {
    if (!confirm("Hapus review ini permanen?")) return;
    setActionLoading(id);
    try {
      await $api.delete(`/admin/reviews/${id}`);
      load();
    } catch (e: any) {
      alert("Error: " + e.message);
    } finally {
      setActionLoading(null);
    }
  };

  const renderStars = (rating: number) => {
    return (
      <span className="text-yellow-500 font-semibold">
        {"★".repeat(rating)}{"☆".repeat(5 - rating)}
        <span className="text-gray-400 text-xs ml-1">({rating}/5)</span>
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800 dark:text-white/90">Moderasi Reviews</h2>
          <p className="text-sm text-gray-500">Kelola review customer: approve, hide, atau hapus.</p>
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="h-10 rounded-lg border border-gray-300 bg-transparent px-3 py-2.5 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
        >
          <option value="">Semua Status</option>
          <option value="PENDING">Pending (Belum dimoderasi)</option>
          <option value="APPROVED">Approved (Tampil)</option>
          <option value="HIDDEN">Hidden (Disembunyikan)</option>
        </select>
      </div>

      {loading && <div className="p-8 text-center text-sm text-gray-400">Loading reviews...</div>}

      {!loading && reviews.length === 0 && (
        <div className="p-8 text-center text-gray-400 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03]">
          {filterStatus ? "Tidak ada review dengan status ini." : "Belum ada review masuk."}
        </div>
      )}

      <div className="space-y-4">
        {reviews.map((r) => (
          <div
            key={r.id}
            className={`rounded-2xl border p-5 bg-white dark:bg-white/[0.03] transition-colors ${
              r.status === "PENDING"
                ? "border-yellow-200 bg-yellow-50/30 dark:border-yellow-900/30 dark:bg-yellow-900/5"
                : r.status === "HIDDEN"
                ? "border-gray-200 bg-gray-50/50 dark:border-gray-800"
                : "border-green-200 bg-green-50/10 dark:border-green-900/20"
            } dark:border-gray-800`}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex-1 min-w-[200px]">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-sm font-semibold text-gray-800 dark:text-white/90">{r.user?.name || "Anonymous"}</span>
                  <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${statusColors[r.status]}`}>
                    {r.status}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-400 mb-3">
                  <span>{r.property?.name}</span>
                  <span>•</span>
                  <span className="font-mono">#{r.booking?.bookingCode}</span>
                  <span>•</span>
                  <span>{new Date(r.createdAt).toLocaleString("id-ID")}</span>
                </div>
                <div className="mb-2">{renderStars(r.rating)}</div>
                {r.comment && <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{r.comment}</p>}
              </div>

              <div className="flex gap-2 flex-shrink-0">
                {r.status !== "APPROVED" && (
                  <button
                    disabled={actionLoading === r.id}
                    onClick={() => updateStatus(r.id, "APPROVED")}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
                  >
                    ✓ Approve
                  </button>
                )}
                {r.status !== "HIDDEN" && (
                  <button
                    disabled={actionLoading === r.id}
                    onClick={() => updateStatus(r.id, "HIDDEN")}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-gray-500 text-white hover:bg-gray-600 disabled:opacity-50 transition-colors"
                  >
                    ��� Sembunyikan
                  </button>
                )}
                {r.status === "HIDDEN" && (
                  <button
                    disabled={actionLoading === r.id}
                    onClick={() => updateStatus(r.id, "PENDING")}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-yellow-500 text-white hover:bg-yellow-600 disabled:opacity-50 transition-colors"
                  >
                    ↻ Reset
                  </button>
                )}
                <button
                  disabled={actionLoading === r.id}
                  onClick={() => deleteReview(r.id)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/20 dark:text-red-400 disabled:opacity-50 transition-colors"
                >
                  ✕ Hapus
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
