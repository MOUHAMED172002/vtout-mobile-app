import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Dimensions, Modal } from 'react-native';
import Svg, { Defs, Mask, Rect } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { radius } from '../theme/colors';
import { useTheme } from '../context/ThemeContext';
import { useTour } from './TourContext';

const PAD = 8; // marge entre l'élément ciblé et le halo découpé autour de lui

// Overlay plein écran de la visite guidée — monté une seule fois à la
// racine de l'app (voir App.js, comme SupportChatBubble). Rend `null` tant
// qu'aucune visite n'est active (voir tourSteps.js pour le contenu, et
// HomeScreen.js / ProfileScreen.js pour ce qui la déclenche).
export default function TourOverlay() {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const { steps, stepIndex, anchors, next, stop } = useTour();
  const [rect, setRect] = useState(null);
  const [screen, setScreen] = useState(() => Dimensions.get('window'));
  const skippedTargets = useRef(new Set());

  useEffect(() => {
    const sub = Dimensions.addEventListener('change', ({ window }) => setScreen(window));
    return () => sub?.remove();
  }, []);

  const step = steps?.[stepIndex] || null;

  useEffect(() => {
    if (!step) { setRect(null); return; }
    let cancelled = false;
    setRect(null);

    const measure = anchors.current[step.target];
    if (!measure) {
      // L'élément ciblé n'est pas monté sur l'écran actuel (ex : visite
      // relancée depuis un autre onglet, le temps que la navigation se
      // termine) — on passe directement à l'étape suivante plutôt que de
      // rester bloqué sur une bulle sans rien à montrer.
      if (!skippedTargets.current.has(step.target)) {
        skippedTargets.current.add(step.target);
        const t = setTimeout(() => { if (!cancelled) next(); }, 50);
        return () => clearTimeout(t);
      }
      return;
    }

    measure().then((r) => { if (!cancelled) setRect(r); });
    return () => { cancelled = true; };
  }, [step, anchors, next]);

  if (!step || !rect) return null;

  const cutout = {
    x: Math.max(rect.x - PAD, 0),
    y: Math.max(rect.y - PAD, 0),
    width: rect.width + PAD * 2,
    height: rect.height + PAD * 2,
  };

  // Bulle au-dessus de l'élément s'il est dans la moitié basse de l'écran,
  // en dessous sinon — toujours visible quelle que soit la position ciblée.
  const showAbove = cutout.y > screen.height / 2;
  const cardTop = showAbove
    ? Math.max(cutout.y - 170, 60)
    : Math.min(cutout.y + cutout.height + 16, screen.height - 220);

  const isLast = stepIndex === (steps?.length || 0) - 1;

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={stop}>
      <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
        <Svg width={screen.width} height={screen.height} style={StyleSheet.absoluteFill} pointerEvents="none">
          <Defs>
            <Mask id="tourMask">
              <Rect x={0} y={0} width={screen.width} height={screen.height} fill="#fff" />
              <Rect x={cutout.x} y={cutout.y} width={cutout.width} height={cutout.height} rx={16} fill="#000" />
            </Mask>
          </Defs>
          <Rect x={0} y={0} width={screen.width} height={screen.height} fill="rgba(15,23,42,0.78)" mask="url(#tourMask)" />
          <Rect x={cutout.x} y={cutout.y} width={cutout.width} height={cutout.height} rx={16} fill="none" stroke={colors.primary} strokeWidth={2.5} />
        </Svg>

        {/* Zone du halo cliquable : tape sur l'élément mis en avant = étape suivante */}
        <Pressable
          style={{ position: 'absolute', left: cutout.x, top: cutout.y, width: cutout.width, height: cutout.height }}
          onPress={next}
        />

        <View style={[styles.card, { top: cardTop }]}>
          <View style={styles.cardHeader}>
            <Text style={styles.stepCount}>{stepIndex + 1} / {steps.length}</Text>
            <Pressable onPress={stop} hitSlop={10}>
              <Ionicons name="close" size={18} color={colors.textFaint} />
            </Pressable>
          </View>
          <Text style={styles.title}>{step.title}</Text>
          <Text style={styles.description}>{step.description}</Text>

          <View style={styles.dotsRow}>
            {steps.map((_, i) => (
              <View key={i} style={[styles.dot, i === stepIndex && styles.dotActive]} />
            ))}
          </View>

          <View style={styles.actionsRow}>
            <Pressable onPress={stop}>
              <Text style={styles.skipText}>Passer</Text>
            </Pressable>
            <Pressable style={styles.nextBtn} onPress={next}>
              <Text style={styles.nextBtnText}>{isLast ? "C'est parti !" : 'Suivant'}</Text>
              {!isLast && <Ionicons name="arrow-forward" size={15} color="#fff" />}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (colors) => StyleSheet.create({
  card: {
    position: 'absolute', left: 20, right: 20,
    backgroundColor: colors.surface, borderRadius: radius.xl, padding: 20,
    shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 12,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  stepCount: { fontSize: 10, fontWeight: '900', color: colors.primary, textTransform: 'uppercase', letterSpacing: 0.8 },
  title: { fontSize: 16, fontWeight: '900', color: colors.text },
  description: { fontSize: 12.5, fontWeight: '600', color: colors.textMuted, marginTop: 6, lineHeight: 18 },
  dotsRow: { flexDirection: 'row', gap: 6, marginTop: 16 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.border },
  dotActive: { backgroundColor: colors.primary, width: 16 },
  actionsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 18 },
  skipText: { fontSize: 12.5, fontWeight: '800', color: colors.textFaint },
  nextBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.primary,
    paddingHorizontal: 18, paddingVertical: 11, borderRadius: radius.md,
  },
  nextBtnText: { fontSize: 12.5, fontWeight: '800', color: '#fff' },
});
