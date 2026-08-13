import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Badge "Vendeur vérifié" — un seul design, réutilisé partout où l'on
// affiche le statut de vérification d'un vendeur (carte produit, page
// produit, en-tête boutique). Miroir de
// frontend/src/component/Shared/VerifiedSellerBadge.jsx (même couleur
// #1d9bf0, mêmes 3 variantes) :
// - variant="icon" → juste le sceau (à coller après un titre/nom), sans
//   libellé.
// - variant="chip" → sceau + "Vendeur vérifié" en tout petit, sur sa
//   propre ligne — cartes produit compactes, sous le nom.
// - variant="pill" → sceau + "Vérifié", dans une pastille — là où il y a
//   la place (page produit, en-tête boutique).
const BADGE_BLUE = '#1d9bf0';

export default function VerifiedSellerBadge({ variant = 'icon', size = 14 }) {
  if (variant === 'chip') {
    return (
      <View style={styles.chip}>
        <Ionicons name="checkmark-circle" size={size} color={BADGE_BLUE} />
        <Text style={styles.chipText}>Vendeur vérifié</Text>
      </View>
    );
  }

  if (variant === 'pill') {
    return (
      <View style={styles.pill}>
        <Ionicons name="checkmark-circle" size={size} color={BADGE_BLUE} />
        <Text style={styles.pillText}>Vérifié</Text>
      </View>
    );
  }

  return <Ionicons name="checkmark-circle" size={size} color={BADGE_BLUE} />;
}

const styles = StyleSheet.create({
  chip: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  chipText: { fontSize: 9, fontWeight: '900', color: BADGE_BLUE, textTransform: 'uppercase' },
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start',
    backgroundColor: `${BADGE_BLUE}18`, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999,
  },
  pillText: { fontSize: 11, fontWeight: '900', color: BADGE_BLUE, textTransform: 'uppercase' },
});
