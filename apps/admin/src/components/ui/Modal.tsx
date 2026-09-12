"use client";

import React from "react";

export default function Modal({
  open,
  onClose,
  children,
  maxWidth = "max-w-sm",
}: {
  open: boolean;
  onClose?: () => void;
  children: React.ReactNode;
  maxWidth?: string;
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      onClick={onClose}
    >
      <div
        className={`w-full ${maxWidth} rounded-2xl bg-white p-6 dark:bg-gray-900`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}