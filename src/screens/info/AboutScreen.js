import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, radius } from '../../theme/colors';

const VALUES = [
  { icon: 'shield-checkmark', title: 'Confiance', text: "Vendeurs vérifiés et paiement sécurisé à chaque commande." },
  { icon: 'flash', title: 'Rapidité', text: 'Livraison optimisée partout où Vtout opère au Bénin.' },
  { icon: 'people', title: 'Communauté', text: 'Des milliers de vendeurs locaux, un seul endroit pour vendre.' },
  { icon: 'heart', title: 'Proximité', text: "Un support à l'écoute, disponible directement dans l'app." },
];

export default function AboutScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        <LinearGradient colors={[colors.secondary, colors.navy]} style={styles.hero}>
          <Text style={styles.heroBadge}>🇧🇯 Marketplace N°1 du Bénin</Text>
          <Text style={styles.heroTitle}>On vend tout.</Text>
          <Text style={styles.heroText}>
            Vtout connecte des milliers de vendeurs locaux à des acheteurs partout au Bénin —
            un catalogue immense, une livraison fiable, un paiement sécurisé.
          </Text>
        </LinearGradient>

        <View style={styles.content}>
          <Text style={styles.sectionTitle}>Nos valeurs</Text>
          <View style={styles.valuesGrid}>
            {VALUES.map((v) => (
              <View key={v.title} style={styles.valueCard}>
                <View style={styles.valueIcon}>
                  <Ionicons name={v.icon} size={18} color={colors.primary} />
                </View>
                <Text style={styles.valueTitle}>{v.title}</Text>
                <Text style={styles.valueText}>{v.text}</Text>
              </View>
            ))}
          </View>

          <Text style={styles.sectionTitle}>Notre mission</Text>
          <Text style={styles.paragraph}>
            Donner à chaque vendeur béninois — de l'artisan au commerçant — un accès simple à des
            milliers d'acheteurs, et à chaque acheteur la certitude de recevoir ce qu'il a commandé,
            au bon prix, au bon endroit.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  hero: { padding: 28, paddingTop: 24, gap: 12, borderBottomLeftRadius: radius.xl, borderBottomRightRadius: radius.xl },
  heroBadge: { color: colors.primary, fontSize: 11, fontWeight: '800' },
  heroTitle: { color: '#fff', fontSize: 30, fontWeight: '900' },
  heroText: { color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '500', lineHeight: 20 },
  content: { padding: 20, gap: 16 },
  sectionTitle: { fontSize: 17, fontWeight: '900', color: colors.text, marginTop: 8 },
  valuesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  valueCard: { flexBasis: '47%', flexGrow: 1, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: 14, gap: 6 },
  valueIcon: { width: 32, height: 32, borderRadius: 12, backgroundColor: 'rgba(243,112,33,0.1)', alignItems: 'center', justifyContent: 'center' },
  valueTitle: { fontSize: 13, fontWeight: '800', color: colors.text },
  valueText: { fontSize: 11, color: colors.textMuted, fontWeight: '500', lineHeight: 16 },
  paragraph: { fontSize: 13, color: colors.textMuted, fontWeight: '500', lineHeight: 21 },
});
