import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useTour } from '../tour/TourContext';

// Bouton "?" réutilisé dans les en-têtes vendeur/livreur/admin (voir
// {Supplier,Delivery,Admin}Navigator.js) pour rejouer la visite guidée de
// cet espace à la demande — équivalent de l'entrée "Revoir la visite
// guidée" dans Profil côté acheteur, qui n'a pas d'écran "profil" partagé.
export default function TourHelpButton({ steps }) {
  const { colors } = useTheme();
  const { start } = useTour();
  return (
    <Pressable style={styles.btn} onPress={() => start(steps)} hitSlop={8}>
      <Ionicons name="help-circle-outline" size={22} color={colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: { padding: 2 },
});
