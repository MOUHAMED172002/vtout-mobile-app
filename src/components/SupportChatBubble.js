import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useSpace } from '../context/SpaceContext';
import { navigate } from '../navigation/navigationRef';

// Bulle flottante de support, visible dans les espaces client et vendeur
// (équivalent mobile du SupportChat du site web / supplier-portal).
const SUPPORTED_SPACES = ['customer', 'supplier'];

export default function SupportChatBubble() {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const { isSignedIn } = useAuth();
  const { space } = useSpace();
  const insets = useSafeAreaInsets();

  if (!SUPPORTED_SPACES.includes(space) || !isSignedIn) return null;

  return (
    <Pressable
      style={[styles.bubble, { bottom: insets.bottom + 74 }]}
      onPress={() => navigate('SupportChat')}
    >
      <Ionicons name="chatbox-ellipses" size={24} color="#fff" />
    </Pressable>
  );
}

const createStyles = (colors) => StyleSheet.create({
  bubble: {
    position: 'absolute', right: 16, width: 54, height: 54, borderRadius: 27,
    backgroundColor: colors.navy, alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 10, shadowOffset: { width: 0, height: 6 }, elevation: 8,
  },
});
