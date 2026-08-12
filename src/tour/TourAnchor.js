import React, { useEffect, useRef } from 'react';
import { View } from 'react-native';
import { useTour } from './TourContext';

// À poser autour de n'importe quel élément pour le rendre ciblable par une
// étape de visite guidée (voir tourSteps.js — `target: 'search-bar'` doit
// correspondre à l'`id` donné ici). `collapsable={false}` est indispensable
// sur Android : sans lui, le moteur natif peut "aplatir" cette View dans
// son parent pour optimiser le rendu, et measureInWindow() ne retourne
// alors plus rien d'exploitable.
export default function TourAnchor({ id, children, style }) {
  const ref = useRef(null);
  const { registerAnchor, unregisterAnchor } = useTour();

  useEffect(() => {
    registerAnchor(id, () => new Promise((resolve) => {
      if (!ref.current) { resolve(null); return; }
      ref.current.measureInWindow((x, y, width, height) => {
        if (width === 0 && height === 0) resolve(null);
        else resolve({ x, y, width, height });
      });
    }));
    return () => unregisterAnchor(id);
  }, [id, registerAnchor, unregisterAnchor]);

  return (
    <View ref={ref} style={style} collapsable={false}>
      {children}
    </View>
  );
}
