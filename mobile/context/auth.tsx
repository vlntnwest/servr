import { Session, User } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useState } from "react";

import { supabase } from "@/lib/supabase";

type AuthContextType = {
  session: Session | null;
  initialized: boolean;
};

const AuthContext = createContext<AuthContextType>({
  session: null,
  initialized: false,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        setSession(session);
      })
      .finally(() => {
        setInitialized(true);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_, session) => setSession(session));

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ session, initialized }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
