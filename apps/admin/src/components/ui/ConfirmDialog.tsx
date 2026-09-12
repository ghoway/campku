"use client";

import React from "react";
import Modal from "./Modal";

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Ya, Lanjutkan",
  cancelLabel = "Batal",
  variant = "danger",
  loading = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "primary";
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const confirmCls =
    variant === "danger"
      ? "bg-red-600 hover:bg-red-700 text-white"
      : "bg-brand-500 hover:bg-brand-600 text-white";

  return (
    <Modal open={open} onClose={() => !loading && onCancel()}>
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400">
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
        </svg>
      </div>
      <h3 className="text-center text-lg font-bold text-gray-800 dark:text-white/90">{title}</h3>
      <div className="mt-2 text-center text-sm text-gray-500 dark:text-gray-400">{message}</div>
      <div className="mt-5 flex gap-3">
        <button
          onClick={onCancel}
          disabled={loading}
          className="flex-1 rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          {cancelLabel}
        </button>
        <button
          onClick={onConfirm}
          disabled={loading}
          className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold disabled:opacity-50 ${confirmCls}`}
        >
          {loading ? "Memproses..." : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}