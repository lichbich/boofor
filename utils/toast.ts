export type ToastType = "success" | "error" | "info" | "warning";

export interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

type ToastListener = (toast: ToastMessage) => void;
const listeners: Set<ToastListener> = new Set();

export const toast = {
  subscribe(listener: ToastListener) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  show(message: string, type: ToastType = "info", duration = 3000) {
    const id = Math.random().toString(36).substring(2, 9);
    listeners.forEach((listener) => listener({ id, message, type, duration }));
  },
  success(message: string, duration = 3000) {
    this.show(message, "success", duration);
  },
  error(message: string, duration = 4000) {
    this.show(message, "error", duration);
  },
  info(message: string, duration = 3000) {
    this.show(message, "info", duration);
  },
  warning(message: string, duration = 3500) {
    this.show(message, "warning", duration);
  },
};
