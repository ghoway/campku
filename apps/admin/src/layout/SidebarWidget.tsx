import React from "react";

const appName = process.env.NEXT_PUBLIC_APP_NAME || "Campku";

export default function SidebarWidget() {
  return (
    <div
      className={`mx-auto mb-10 w-full max-w-60 rounded-2xl bg-brand-50 px-4 py-5 text-center dark:bg-brand-900/10`}
    >
      <h3 className="mb-2 font-semibold text-brand-800 dark:text-brand-300">
        {appName} Ops
      </h3>
      <p className="mb-4 text-brand-600 text-theme-sm dark:text-brand-400">
        Sistem operasional reservasi camping ground.
      </p>
    </div>
  );
}
