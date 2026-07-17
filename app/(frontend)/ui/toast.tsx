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
    const handler = (e: Event) => {
      const { message, type } = (e as CustomEvent).detail;
      const id = ++idCounter;
      setToasts((prev) => [...prev, { id, message, type }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4000);
    };
    window.addEventListener("toast", handler);
    return () => window.removeEventListener("toast", handler);
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`rounded-lg px-4 py-3 text-sm font-medium text-white shadow-lg transition-all ${
            t.type === "success" ? "bg-green-600" : "bg-red-600"
          }`}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}
