import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import { useAuth } from './AuthContext';

// Un compte peut cumuler plusieurs rôles (client + vendeur, ou admin qui
// veut aussi voir l'espace livreur). "space" détermine quelle interface
// racine est affichée — équivalent mobile du PortalSwitcher du site web.
const SpaceContext = createContext(null);

export function SpaceProvider({ children }) {
  const { isSignedIn, isSupplier, isDelivery, isAdmin } = useAuth();
  const [space, setSpace] = useState('customer');

  useEffect(() => {
    if (!isSignedIn) setSpace('customer');
  }, [isSignedIn]);

  useEffect(() => {
    if (space === 'supplier' && !isSupplier) setSpace('customer');
    if (space === 'delivery' && !isDelivery) setSpace('customer');
    if (space === 'admin' && !isAdmin) setSpace('customer');
  }, [space, isSupplier, isDelivery, isAdmin]);

  const availableSpaces = useMemo(() => {
    const spaces = [{ key: 'customer', label: 'Espace client', icon: 'storefront-outline' }];
    if (isSupplier) spaces.push({ key: 'supplier', label: 'Espace vendeur', icon: 'briefcase-outline' });
    if (isDelivery) spaces.push({ key: 'delivery', label: 'Espace livreur', icon: 'bicycle-outline' });
    if (isAdmin) spaces.push({ key: 'admin', label: 'Espace admin', icon: 'shield-checkmark-outline' });
    return spaces;
  }, [isSupplier, isDelivery, isAdmin]);

  const switchSpace = useCallback((key) => setSpace(key), []);

  return (
    <SpaceContext.Provider value={{ space, switchSpace, availableSpaces }}>
      {children}
    </SpaceContext.Provider>
  );
}

export const useSpace = () => {
  const ctx = useContext(SpaceContext);
  if (!ctx) throw new Error('useSpace must be used within a SpaceProvider');
  return ctx;
};
