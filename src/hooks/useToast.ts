import { useCallback, useState } from "react";

export function useToast() {
  const [toast, setToast] = useState<string | null>(null);
  const notify = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 3000);
  }, []);
  return { toast, notify };
}
