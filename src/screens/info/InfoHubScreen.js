import React from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../../theme/colors';

const SECTIONS = [
  {
    label: 'Découvrir',
    items: [
      { label: 'À propos de Vtout', icon: 'heart-outline', route: 'About' },
      { label: 'Comment ça marche', icon: 'help-buoy-outline', route: 'HowItWorks' },
      { label: 'Promotions', icon: 'flash-outline', route: 'Promotions' },
      { label: 'Blog', icon: 'newspaper-outline', route: 'BlogList' },
      { label: 'Témoignages', icon: 'chatbubbles-outline', route: 'Testimonials' },
    ],
  },
  {
    label: 'Aide',
    items: [
      { label: 'Questions fréquentes', icon: 'help-circle-outline', route: 'Faq' },
      { label: 'Contactez-nous', icon: 'call-outline', route: 'Contact' },
      { label: 'Discuter avec le support', icon: 'chatbox-ellipses-outline', route: 'SupportChat' },
    ],
  },
  {
    label: 'Légal',
    items: [
      { label: 'Conditions générales de vente', icon: 'document-text-outline', route: 'PolicyDetail', params: { type: 'cgv', title: 'CGV' } },
      { label: 'Politique de confidentialité', icon: 'lock-closed-outline', route: 'PolicyDetail', params: { type: 'privacy', title: 'Politique de confidentialité' } },
      { label: 'Politique de retour', icon: 'return-down-back-outline', route: 'PolicyDetail', params: { type: 'return', title: 'Politique de retour' } },
      { label: 'Mentions légales', icon: 'shield-checkmark-outline', route: 'PolicyDetail', params: { type: 'mentions_legales', title: 'Mentions légales' } },
    ],
  },
];

export default function InfoHubScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 22 }}>
        {SECTIONS.map((section) => (
          <View key={section.label} style={{ gap: 10 }}>
            <Text style={styles.sectionLabel}>{section.label}</Text>
            <View style={styles.card}>
              {section.items.map((item, idx) => (
                <Pressable
                  key={item.label}
                  style={[styles.row, idx === section.items.length - 1 && { borderBottomWidth: 0 }]}
                  onPress={() => navigation.navigate(item.route, item.params)}
                >
                  <View style={styles.iconWrap}>
                    <Ionicons name={item.icon} size={17} color={colors.primary} />
                  </View>
                  <Text style={styles.label}>{item.label}</Text>
                  <Ionicons name="chevron-forward" size={17} color={colors.textFaint} />
                </Pressable>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  sectionLabel: { fontSize: 11, fontWeight: '800', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginLeft: 4 },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
  iconWrap: { width: 32, height: 32, borderRadius: 10, backgroundColor: 'rgba(243,112,33,0.1)', alignItems: 'center', justifyContent: 'center' },
  label: { flex: 1, fontSize: 13.5, fontWeight: '700', color: colors.text },
});
