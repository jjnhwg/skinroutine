import { createContext, useContext } from "react";

export const ToastContext = createContext<(message: string) => void>(() => {});

/** Call this from anywhere under ToastProvider to flash a message. */
export function useToast() {
  return useContext(ToastContext);
}
