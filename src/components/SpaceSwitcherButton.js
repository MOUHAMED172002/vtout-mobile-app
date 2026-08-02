import React, { useState } from 'react';
import { View, Text, Pressable, Modal, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { radius } from '../theme/colors';
import { useTheme } from '../context/ThemeContext';
import { useSpace } from '../context/SpaceContext';

// Bouton d'en-tête permettant à un compte qui cumule plusieurs rôles
// (client + vendeur / livreur / admin) de basculer entre ses espaces —
// équivalent mobile du PortalSwitcher du site web. Ne s'affiche que si le
// compte a plus d'un espace disponible.
export default function SpaceSwitcherButton() {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const { space, switchSpace, availableSpaces } = useSpace();
  const [open, setOpen] = useState(false);

  if (availableSpaces.length <= 1) return null;

  return (
    <>
      <Pressable style={styles.trigger} onPress={() => setOpen(true)}>
        <Ionicons name="swap-horizontal" size={18} color={colors.text} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.title}>Changer d'espace</Text>
            {availableSpaces.map((s) => (
              <Pressable
                key={s.key}
                style={[styles.row, s.key === space && styles.rowActive]}
                onPress={() => { switchSpace(s.key); setOpen(false); }}
              >
                <Ionicons name={s.icon} size={18} color={s.key === space ? colors.primary : colors.textMuted} />
                <Text style={[styles.rowText, s.key === space && { color: colors.primary }]}>{s.label}</Text>
                {s.key === space && <Ionicons name="checkmark" size={16} color={colors.primary} style={{ marginLeft: 'auto' }} />}
              </Pressable>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const createStyles = (colors) => StyleSheet.create({
  trigger: {
    width: 34, height: 34, borderRadius: 17, backgroundColor: '#f1f5f9',
    alignItems: 'center', justifyContent: 'center', marginRight: 6,
  },
  backdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'center', padding: 24 },
  sheet: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: 10 },
  title: { fontSize: 11, fontWeight: '800', color: colors.textMuted, textTransform: 'uppercase', padding: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, paddingVertical: 14, borderRadius: radius.md },
  rowActive: { backgroundColor: 'rgba(243,112,33,0.08)' },
  rowText: { fontSize: 14, fontWeight: '700', color: colors.text },
});
