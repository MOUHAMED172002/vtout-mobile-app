import React from 'react';
import { Pressable, Text, StyleSheet, ActivityIndicator, View } from 'react-native';
import { radius } from '../theme/colors';
import { useTheme } from '../context/ThemeContext';

export default function Button({ title, onPress, variant = 'primary', loading = false, disabled = false, icon, style }) {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const isDisabled = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        variant === 'primary' && styles.primary,
        variant === 'secondary' && styles.secondary,
        variant === 'outline' && styles.outline,
        variant === 'ghost' && styles.ghost,
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'outline' || variant === 'ghost' ? colors.primary : '#fff'} />
      ) : (
        <View style={styles.content}>
          {icon}
          <Text style={[
            styles.text,
            variant === 'outline' && styles.outlineText,
            variant === 'ghost' && styles.ghostText,
          ]}>
            {title}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const createStyles = (colors) => StyleSheet.create({
  base: {
    height: 52,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  content: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  primary: { backgroundColor: colors.primary },
  secondary: { backgroundColor: colors.secondary },
  outline: { backgroundColor: 'transparent', borderWidth: 2, borderColor: colors.border },
  ghost: { backgroundColor: 'transparent' },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  text: { color: '#fff', fontWeight: '800', fontSize: 15 },
  outlineText: { color: colors.text },
  ghostText: { color: colors.primary },
});
