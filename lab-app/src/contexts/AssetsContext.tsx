import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getLogo } from '../lib/api';

interface AssetsContextValue {
  logo: string | null;
  setLogo: (v: string | null) => void;
}

const AssetsContext = createContext<AssetsContextValue>({ logo: null, setLogo: () => {} });

export function AssetsProvider({ children }: { children: ReactNode }) {
  const [logo, setLogo] = useState<string | null>(null);

  useEffect(() => {
    getLogo().then(v => setLogo(v ?? null)).catch(err => console.warn('Failed to load logo:', err));
  }, []);

  return (
    <AssetsContext.Provider value={{ logo, setLogo }}>
      {children}
    </AssetsContext.Provider>
  );
}

export function useAssets() {
  return useContext(AssetsContext);
}
