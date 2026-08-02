import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { useSpace } from '../context/SpaceContext';
import { navigate } from '../navigation/navigationRef';

// Bulle flottante de support, visible dans l'espace client uniquement
// (équivalent mobile du SupportChat du site web).
export default function SupportChatBubble() {
  const { isSignedIn } = useAuth();
  const { space } = useSpace();
  const insets = useSafeAreaInsets();

  if (space !== 'customer' || !isSignedIn) return null;

  return (
    <Pressable
      style={[styles.bubble, { bottom: insets.bottom + 74 }]}
      onPress={() => navigate('SupportChat')}
    >
      <Ionicons name="chatbox-ellipses" size={24} color="#fff" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bubble: {
    position: 'absolute', right: 16, width: 54, height: 54, borderRadius: 27,
    backgroundColor: colors.navy, alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 10, shadowOffset: { width: 0, height: 6 }, elevation: 8,
  },
});
