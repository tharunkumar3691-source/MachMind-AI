import React, { createContext, useContext, useState, useEffect } from 'react';

export interface AuthUser {
  id?: string;
  name?: string;
  email?: string;
  image?: string;
}

export interface AuthSession {
  user?: AuthUser;
  expires?: string;
}

interface AuthContextType {
  session: AuthSession | null;
  isAuthenticated: boolean;
  loading: boolean;
  csrfToken: string | null;
  signOut: () => void;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [csrfToken, setCsrfToken] = useState<string | null>(null);

  const fetchSession = async () => {
    try {
      const res = await fetch('/api/auth/session');
      if (res.ok) {
        const data = await res.json();
        if (data && Object.keys(data).length > 0) {
          setSession(data);
        } else {
          setSession(null);
        }
      }
    } catch (e) {
      console.error('Failed to fetch Auth session', e);
      setSession(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchCsrf = async () => {
    try {
      const res = await fetch('/api/auth/csrf');
      if (res.ok) {
        const { csrfToken: token } = await res.json();
        setCsrfToken(token);
      }
    } catch (e) {
      console.error('Failed to fetch CSRF token', e);
    }
  };

  useEffect(() => {
    fetchSession();
    fetchCsrf();
  }, []);

  const signOut = () => {
    if (!csrfToken) return;
    const form = document.createElement('form');
    form.action = '/api/auth/signout';
    form.method = 'POST';

    const inputCsrf = document.createElement('input');
    inputCsrf.type = 'hidden';
    inputCsrf.name = 'csrfToken';
    inputCsrf.value = csrfToken;
    form.appendChild(inputCsrf);

    const inputCallback = document.createElement('input');
    inputCallback.type = 'hidden';
    inputCallback.name = 'callbackUrl';
    inputCallback.value = '/';
    form.appendChild(inputCallback);

    document.body.appendChild(form);
    form.submit();
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        isAuthenticated: !!session?.user,
        loading,
        csrfToken,
        signOut,
        refreshSession: fetchSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export function useLocalSession() {
  const { session, isAuthenticated, signOut } = useAuth();
  
  const adaptedSession = {
    id: session?.user?.id || 'local-user',
    name: session?.user?.name || 'Field Technician',
    title: 'Industrial Specialist',
    technician_id: session?.user?.email || 'T-1001',
    avatar_url: session?.user?.image || null,
  };

  return {
    session: adaptedSession,
    updateSession: (data?: any) => {},
    resetSession: signOut,
    isAuthenticated,
  };
}
