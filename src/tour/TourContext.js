import React, { createContext, useCallback, useContext, useRef, useState } from 'react';

// ---------------------------------------------------------------------------
// Visite guidée réutilisable (flèches + bulle d'explication sur les éléments
// clés d'un écran) — nouveauté propre à l'app mobile, aucun équivalent web à
// reproduire. Architecture en 3 pièces :
// - TourContext (ici) : état de la visite en cours + registre des "ancres"
//   (éléments de l'écran mesurables par id).
// - TourAnchor.js : wrapper à poser autour d'un élément pour le rendre
//   ciblable par une étape de visite.
// - TourOverlay.js : l'overlay plein écran qui dessine le halo + la bulle,
//   monté une seule fois à la racine de l'app (voir App.js).
// ---------------------------------------------------------------------------

const TourContext = createContext(null);

export function TourProvider({ children }) {
  // Registre des fonctions de mesure par id d'ancre — une ref (pas un
  // state) car s'enregistrer/se désenregistrer à chaque montage d'écran ne
  // doit jamais déclencher de re-render du provider.
  const anchors = useRef({});
  // `steps` et `index` regroupés dans un seul state pour rester toujours
  // cohérents entre eux (éviter un `next()` qui lit un `steps` périmé).
  const [tour, setTour] = useState(null); // { steps, index } | null

  const registerAnchor = useCallback((id, measure) => {
    anchors.current[id] = measure;
  }, []);
  const unregisterAnchor = useCallback((id) => {
    delete anchors.current[id];
  }, []);

  const start = useCallback((steps) => {
    if (!steps || steps.length === 0) return;
    setTour({ steps, index: 0 });
  }, []);

  const next = useCallback(() => {
    setTour((current) => {
      if (!current) return current;
      const nextIndex = current.index + 1;
      if (nextIndex >= current.steps.length) return null;
      return { ...current, index: nextIndex };
    });
  }, []);

  const stop = useCallback(() => setTour(null), []);

  const value = {
    anchors,
    steps: tour?.steps || null,
    stepIndex: tour?.index || 0,
    registerAnchor,
    unregisterAnchor,
    start,
    next,
    stop,
  };
  return <TourContext.Provider value={value}>{children}</TourContext.Provider>;
}

export const useTour = () => {
  const ctx = useContext(TourContext);
  if (!ctx) throw new Error('useTour must be used within a TourProvider');
  return ctx;
};
