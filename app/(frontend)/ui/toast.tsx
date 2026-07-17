"use client";

import { useEffect, useState } from "react";

type ToastType = "success" | "error";

export function showToast(message: string, type: ToastType = "success") {
  const event = new CustomEvent("toast", { detail: { message, type } });
  window.dispatchEvent(event);
}

export function Toast() {
  const [toasts, setToasts] = useState<{ id: number; message: string; type: ToastType }[]>([]);

  useEffect(() => {
    let idCounter = 0;
    const timers = new Map<number, ReturnType<typeof setTimeout>>();
    const handler = (e: Event) => {
      const { message, type } = (e as CustomEvent).detail;
      const id = ++idCounter;
      setToasts((prev) => [...prev, { id, message, type }]);
      timers.set(id, setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
        timers.delete(id);
      }, 4000));
    };
    window.addEventListener("toast", handler);
    return () => {
      window.removeEventListener("toast", handler);
      timers.forEach((t) => clearTimeout(t));
    };
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`rounded-lg border px-4 py-3 text-sm font-medium shadow-lg transition-all duration-200 ease-out ${
            t.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
              : "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/40 dark:text-red-300"
          }`}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}
