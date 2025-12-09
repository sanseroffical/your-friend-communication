import { useState, useEffect } from "react";

export interface ClipUser {
  id: string;
  clip_id: string;
  display_name: string | null;
  created_at: string;
}

export const useClipUser = () => {
  const [user, setUser] = useState<ClipUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem("clipUser");
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem("clipUser");
      }
    }
    setIsLoading(false);
  }, []);

  const logout = () => {
    localStorage.removeItem("clipUser");
    setUser(null);
  };

  return { user, isLoading, logout };
};
