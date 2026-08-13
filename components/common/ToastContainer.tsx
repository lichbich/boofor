"use client";

import React, { useState, useEffect } from "react";
import { toast, ToastMessage } from "@/utils/toast";
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from "lucide-react";

export const ToastContainer: React.FC = () => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    const unsubscribe = toast.subscribe((newToast) => {
      setToasts((prev) => [...prev, newToast]);

      const duration = newToast.duration || 3000;
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== newToast.id));
      }, duration);
    });

    return unsubscribe;
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-5 right-5 z-[999999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0">
      {toasts.map((t) => {
        let icon = <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />;
        let badgeStyle = "bg-white/95 dark:bg-[#161b22]/95 border-emerald-500/30 text-emerald-950 dark:text-emerald-100 shadow-[0_10px_30px_rgba(16,185,129,0.15)]";

        if (t.type === "error") {
          icon = <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />;
          badgeStyle = "bg-white/95 dark:bg-[#161b22]/95 border-rose-500/30 text-rose-950 dark:text-rose-100 shadow-[0_10px_30px_rgba(244,63,94,0.15)]";
        } else if (t.type === "warning") {
          icon = <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />;
          badgeStyle = "bg-white/95 dark:bg-[#161b22]/95 border-amber-500/30 text-amber-950 dark:text-amber-100 shadow-[0_10px_30px_rgba(245,158,11,0.15)]";
        } else if (t.type === "info") {
          icon = <Info className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />;
          badgeStyle = "bg-white/95 dark:bg-[#161b22]/95 border-indigo-500/30 text-indigo-950 dark:text-indigo-100 shadow-[0_10px_30px_rgba(99,102,241,0.15)]";
        }

        return (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-2xl border backdrop-blur-xl transition-all duration-300 animate-in fade-in slide-in-from-top-4 ${badgeStyle}`}
          >
            {icon}
            <div className="flex-1 text-xs font-medium leading-relaxed pr-1">
              {t.message}
            </div>
            <button
              onClick={() => removeToast(t.id)}
              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 rounded-lg transition-colors cursor-pointer shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
