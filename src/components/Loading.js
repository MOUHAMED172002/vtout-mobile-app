import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';

export default function Loading({ fullScreen = true }) {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={[styles.wrap, fullScreen && styles.fullScreen]}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

const createStyles = (colors) => StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  fullScreen: { flex: 1, backgroundColor: colors.background },
});
