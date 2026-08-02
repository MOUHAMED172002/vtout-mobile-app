import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

export default function EmptyState({ icon = 'cube-outline', title, subtitle, action }) {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.wrap}>
      <View style={styles.iconWrap}>
        <Ionicons name={icon} size={32} color={colors.textFaint} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      {action}
    </View>
  );
}

const createStyles = (colors) => StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, paddingHorizontal: 32, gap: 8 },
  iconWrap: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: '#f1f5f9',
    alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  title: { fontSize: 15, fontWeight: '800', color: colors.text, textAlign: 'center' },
  subtitle: { fontSize: 13, color: colors.textMuted, textAlign: 'center', fontWeight: '500' },
});
