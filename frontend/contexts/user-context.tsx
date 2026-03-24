"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { createClient } from "@/lib/supabase/client";
import { getUserMe } from "@/lib/api";
import type { User } from "@/types/api";

type UserContextType = {
  user: User | null;
  isLoading: boolean;
  refetch: () => Promise<void>;
};

const UserContext = createContext<UserContextType | null>(null);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadUser = useCallback(async () => {
    const result = await getUserMe();
    setUser("data" in result ? result.data : null);
  }, []);

  const refetch = useCallback(async () => {
    await loadUser();
  }, [loadUser]);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        loadUser().finally(() => setIsLoading(false));
      } else {
        setIsLoading(false);
      }
    });

    // eslint-disable-next-line react-hooks/exhaustive-deps
    // supabase is instantiated once here; loadUser is stable via useCallback
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        loadUser();
      } else if (event === "SIGNED_OUT") {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <UserContext.Provider value={{ user, isLoading, refetch }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUserContext(): UserContextType {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUserContext must be used within UserProvider");
  return ctx;
}
