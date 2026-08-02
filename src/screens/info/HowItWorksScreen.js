import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { radius } from '../../theme/colors';
import { useTheme } from '../../context/ThemeContext';

const BUYER_STEPS = [
  { icon: 'search', title: 'Trouvez votre produit', text: 'Parcourez le catalogue, les catégories ou les boutiques de vendeurs vérifiés.' },
  { icon: 'bag-check', title: 'Commandez en toute confiance', text: 'Payez à la livraison ou en ligne (Mobile Money, carte bancaire).' },
  { icon: 'bicycle', title: 'Faites-vous livrer', text: 'Un livreur partenaire vous apporte votre commande, où que vous soyez au Bénin.' },
  { icon: 'star', title: 'Laissez un avis', text: 'Partagez votre expérience pour aider la communauté Vtout.' },
];

const SELLER_STEPS = [
  { icon: 'storefront', title: 'Créez votre boutique', text: "Inscrivez-vous en tant que vendeur depuis l'onglet Profil, en quelques minutes." },
  { icon: 'cube', title: 'Ajoutez vos produits', text: 'Photos, prix, stock — publiés après validation rapide par notre équipe.' },
  { icon: 'receipt', title: 'Recevez des commandes', text: 'Gérez vos commandes et leur statut directement depuis votre espace vendeur.' },
  { icon: 'wallet', title: 'Encaissez vos gains', text: 'Suivez votre solde et demandez un retrait à tout moment.' },
];

export default function HowItWorksScreen() {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const [tab, setTab] = useState('buyer');
  const steps = tab === 'buyer' ? BUYER_STEPS : SELLER_STEPS;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.tabRow}>
        <Pressable style={[styles.tab, tab === 'buyer' && styles.tabActive]} onPress={() => setTab('buyer')}>
          <Text style={[styles.tabText, tab === 'buyer' && styles.tabTextActive]}>Acheter</Text>
        </Pressable>
        <Pressable style={[styles.tab, tab === 'seller' && styles.tabActive]} onPress={() => setTab('seller')}>
          <Text style={[styles.tabText, tab === 'seller' && styles.tabTextActive]}>Vendre</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        {steps.map((step, idx) => (
          <View key={step.title} style={styles.stepCard}>
            <View style={styles.stepNumberWrap}>
              <Text style={styles.stepNumber}>{idx + 1}</Text>
            </View>
            <View style={styles.stepIcon}>
              <Ionicons name={step.icon} size={20} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.stepTitle}>{step.title}</Text>
              <Text style={styles.stepText}>{step.text}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  tabRow: { flexDirection: 'row', gap: 8, padding: 16, paddingBottom: 4 },
  tab: { flex: 1, height: 44, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  tabActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabText: { fontSize: 13, fontWeight: '800', color: colors.textMuted },
  tabTextActive: { color: '#fff' },
  stepCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: 14 },
  stepNumberWrap: { width: 20 },
  stepNumber: { fontSize: 16, fontWeight: '900', color: colors.border },
  stepIcon: { width: 40, height: 40, borderRadius: 14, backgroundColor: 'rgba(243,112,33,0.1)', alignItems: 'center', justifyContent: 'center' },
  stepTitle: { fontSize: 13.5, fontWeight: '800', color: colors.text },
  stepText: { fontSize: 11.5, color: colors.textMuted, fontWeight: '500', marginTop: 2, lineHeight: 16 },
});
