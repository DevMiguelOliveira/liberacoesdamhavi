import { createContext, useContext, useEffect, useState, useRef, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface Admin {
  id: string;
  nome: string;
  login: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  admin: Admin | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [admin, setAdminState] = useState<Admin | null>(null);
  const [loading, setLoading] = useState(true);
  const adminRef = useRef<Admin | null>(null);

  const setAdmin = (val: Admin | null) => {
    adminRef.current = val;
    setAdminState(val);
  };

  const fetchAdmin = async (userId: string) => {
    const { data, error } = await supabase
      .from("admins")
      .select("id, nome, login")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      console.error("Error fetching admin:", error);
      return null;
    }
    return data;
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("🔑 [Auth Debug] onAuthStateChange event:", event);
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          // If admin is not loaded yet, show loading screen to avoid access denied flash
          if (!adminRef.current) {
            setLoading(true);
            setTimeout(async () => {
              const adminData = await fetchAdmin(session.user.id);
              setAdmin(adminData);
              setLoading(false);
            }, 0);
          } else {
            // Admin is already loaded. Update it silently without setting loading to true
            setTimeout(async () => {
              const adminData = await fetchAdmin(session.user.id);
              setAdmin(adminData);
            }, 0);
          }
        } else {
          setAdmin(null);
          setLoading(false);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        fetchAdmin(session.user.id).then((adminData) => {
          setAdmin(adminData);
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setAdmin(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        admin,
        loading,
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
