import { useCallback } from "react";
import { toast as sonnerToast } from "sonner";

export function useToast() {
  const notify = useCallback((message: string) => {
    sonnerToast(message);
  }, []);
  return { notify };
}
