"use client";

import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import Modal from "@/components/ui/Modal";

export type DialogVariant = "success" | "danger" | "info";

export type DialogOptions = {
  title: string;
  message?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: DialogVariant;
  allowCancel?: boolean;
  onConfirm?: () => void;
  onCancel?: () => void;
};

type DialogContextValue = {
  success: (opts: Omit<DialogOptions, "variant">) => void;
  info: (opts: Omit<DialogOptions, "variant">) => void;
  confirm: (opts: Omit<DialogOptions, "variant">) => void;
  close: () => void;
};

const DialogContext = createContext<DialogContextValue | null>(null);

export function useDialog(): DialogContextValue {
  const ctx = useContext(DialogContext);
  if (!ctx) throw new Error("useDialog must be used within <DialogProvider />");
  return ctx;
}

export default function DialogProvider({ children }: { children?: React.ReactNode }) {
  const [current, setCurrent] = useState<DialogOptions | null>(null);

  const open = useCallback((opts: DialogOptions) => {
    setCurrent(opts);
  }, []);

  const success = useCallback(
    (opts: Omit<DialogOptions, "variant">) =>
      open({ ...opts, variant: "success", confirmLabel: opts.confirmLabel ?? "OK" }),
    [open]
  );

  const info = useCallback(
    (opts: Omit<DialogOptions, "variant">) =>
      open({ ...opts, variant: "info", confirmLabel: opts.confirmLabel ?? "OK" }),
    [open]
  );

  const confirm = useCallback(
    (opts: Omit<DialogOptions, "variant">) =>
      open({
        ...opts,
        variant: "danger",
        confirmLabel: opts.confirmLabel ?? "Ya, Lanjutkan",
        cancelLabel: opts.cancelLabel ?? "Batal",
        allowCancel: true,
      }),
    [open]
  );

  const close = useCallback(() => {
    setCurrent((cur) => {
      if (cur?.onCancel) {
        cur.onCancel();
      }
      return null;
    });
  }, []);

  const handleConfirm = useCallback(() => {
    setCurrent((cur) => {
      if (cur?.onConfirm) {
        cur.onConfirm();
      }
      return null;
    });
  }, []);

  const value = useMemo(
    () => ({ success, info, confirm, close }),
    [success, info, confirm, close]
  );

  const variant = current?.variant ?? "info";
  const iconCls =
    variant === "success"
      ? "bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400"
      : variant === "danger"
        ? "bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400"
        : "bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400";

  const confirmCls =
    variant === "danger"
      ? "bg-red-600 hover:bg-red-700 text-white"
      : variant === "success"
        ? "bg-green-600 hover:bg-green-700 text-white"
        : "bg-brand-500 hover:bg-brand-600 text-white";

  return (
    <DialogContext.Provider value={value}>
      {children}
      <Modal
        open={!!current}
        onClose={() => current?.allowCancel && close()}
        maxWidth={current?.allowCancel ? "max-w-sm" : "max-w-md"}
      >
        {current && (
          <>
            <div
              className={`mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full ${iconCls}`}
            >
              {variant === "success" ? (
                <svg aria-hidden="true" className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : variant === "danger" ? (
                <svg aria-hidden="true" className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
                </svg>
              ) : (
                <svg aria-hidden="true" className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
              )}
            </div>
            <h3 className="text-center text-lg font-bold text-gray-800 dark:text-white/90">{current.title}</h3>
            {current.message && (
              <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                {current.message}
              </div>
            )}
            <div className="mt-5 flex gap-3">
              {current.allowCancel && (
                <button
                  type="button"
                  onClick={close}
                  className="flex-1 rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  {current.cancelLabel}
                </button>
              )}
              <button
                type="button"
                onClick={handleConfirm}
                className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold ${confirmCls}`}
              >
                {current.confirmLabel}
              </button>
            </div>
          </>
        )}
      </Modal>
    </DialogContext.Provider>
  );
}