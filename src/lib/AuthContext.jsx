import { createContext, useContext, useEffect, useMemo, useState } from "react";
import netlifyIdentity from "netlify-identity-widget";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  useEffect(() => {
    netlifyIdentity.init({
      APIUrl: `${window.location.origin}/.netlify/identity`,
    });
    setUser(netlifyIdentity.currentUser());
    setIsLoadingAuth(false);

    const handleLogin = (nextUser) => {
      setUser(nextUser);
      netlifyIdentity.close();
    };
    const handleLogout = () => setUser(null);

    netlifyIdentity.on("login", handleLogin);
    netlifyIdentity.on("logout", handleLogout);

    return () => {
      netlifyIdentity.off("login", handleLogin);
      netlifyIdentity.off("logout", handleLogout);
    };
  }, []);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isLoadingAuth,
      login: () => netlifyIdentity.open("login"),
      signup: () => netlifyIdentity.open("signup"),
      logout: async () => {
        await netlifyIdentity.logout();
        setUser(null);
      },
      getAccessToken: async () => {
        const currentUser = netlifyIdentity.currentUser();
        if (!currentUser) return null;
        return currentUser.jwt();
      },
    }),
    [user, isLoadingAuth],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
