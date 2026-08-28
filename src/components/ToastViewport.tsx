"use client";

import { CheckCircle2, XCircle, Info, X } from "lucide-react";
import { useToastStore } from "@/store/useToastStore";

const ICONS = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
};

const COLORS = {
  success: "border-olive/30 text-olive",
  error: "border-terracotta/30 text-terracotta",
  info: "border-charcoal/20 text-charcoal",
};

export default function ToastViewport() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2 w-[calc(100%-2.5rem)] max-w-sm">
      {toasts.map((toast) => {
        const Icon = ICONS[toast.variant];
        return (
          <div
            key={toast.id}
            role="status"
            className={`flex items-start gap-3 bg-white border rounded-lg shadow-lg px-4 py-3.5 animate-[toast-in_0.2s_ease-out] ${COLORS[toast.variant]}`}
          >
            <Icon size={18} className="shrink-0 mt-0.5" />
            <p className="text-sm font-medium text-charcoal flex-1">{toast.message}</p>
            <button onClick={() => dismiss(toast.id)} className="text-charcoal/40 hover:text-charcoal transition-colors shrink-0">
              <X size={16} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
