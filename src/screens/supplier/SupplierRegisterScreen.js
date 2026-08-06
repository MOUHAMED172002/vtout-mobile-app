import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, ScrollView, Pressable, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { radius } from '../../theme/colors';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useSpace } from '../../context/SpaceContext';
import { registerSupplier, getMySupplierProfile } from '../../services/supplierService';
import { getPoliciesByType } from '../../services/contentService';
import LocationPicker from '../../components/LocationPicker';
import Button from '../../components/Button';

// ---------------------------------------------------------------------------
// Contenu marketing (pitch "Devenir vendeur") — même texte et mêmes sections
// que supplier-portal/src/pages/SupplierLanding.jsx (landing "Vtout Business"
// du site web), adapté en un seul écran défilant : ici l'utilisateur est déjà
// dans l'app, donc pas de header/nav/footer de site — juste le pitch, suivi
// directement du formulaire d'inscription (au lieu de renvoyer vers /inscription).
// ---------------------------------------------------------------------------

const HERO_CARDS = [
  { icon: 'wallet-outline', title: 'Paiement rapide après livraison', desc: 'Recevez votre argent sur Mobile Money.' },
  { icon: 'car-outline', title: 'Livraison incluse partout au Bénin', desc: 'Nous gérons toute la logistique pour vous.' },
  { icon: 'happy-outline', title: 'Zéro stress', desc: 'Concentrez-vous sur vos produits, on gère le reste.' },
  { icon: 'trending-up-outline', title: 'Plus de visibilité', desc: 'Vos produits visibles par des milliers de clients partout au Bénin.' },
];

const STATS = [
  { icon: 'people-outline', value: '+1 000', label: 'marchands nous font déjà confiance' },
  { icon: 'bag-handle-outline', value: '+25 000', label: 'commandes livrées chaque mois' },
  { icon: 'shield-checkmark-outline', value: '100%', label: 'sécurisé et transparent' },
  { icon: 'headset-outline', value: 'Support dédié', label: '7j/7 pour vous accompagner' },
];

const PROBLEMS = [
  'Messages sans fin et clients qui négocient sans acheter',
  'Livraisons compliquées et coûteuses',
  'Paiements en attente ou clients qui ne paient pas',
  'Peu de visibilité et ventes irrégulières',
  'Gestion manuelle de tout votre processus de vente',
];

const SOLUTIONS = [
  'Vos produits sont visibles par des milliers d’acheteurs',
  'Commandes centralisées et organisées',
  'Livraisons prises en charge partout au Bénin',
  'Paiements rapides après chaque livraison',
  'Plus de temps pour développer votre activité',
];

const ECOSYSTEM = [
  { icon: 'search-outline', title: 'Visibilité nationale', desc: 'Exposez vos produits à des milliers de clients chaque jour sur notre site et application.' },
  { icon: 'cart-outline', title: 'Vente facilitée', desc: 'Nous gérons tout le tunnel de vente de A à Z. Fini la gestion fastidieuse des messages.' },
  { icon: 'card-outline', title: 'Paiement garanti', desc: 'Recevez vos fonds dès la livraison validée directement sur votre compte Mobile Money.' },
  { icon: 'car-outline', title: 'Logistique incluse', desc: 'Nous livrons vos produits à votre place, partout au Bénin.' },
  { icon: 'lock-closed-outline', title: 'Sécurité & transparence', desc: 'Charte qualité Vtout, confidentialité de vos infos et versements ponctuels garantis.' },
];

const TESTIMONIALS = [
  { name: 'Adjo S.', role: 'Vendeuse de pagnes', rating: 5, quote: "Avant Vtout, je passais mes journées sur WhatsApp sans vendre. Aujourd'hui, je reçois plus de commandes et je suis payée rapidement." },
  { name: 'Hervé K.', role: 'Vendeur d’électroniques', rating: 5, quote: "Les livraisons étaient mon casse-tête. Vtout s'occupe de tout et mes clients sont satisfaits partout au Bénin." },
  { name: 'Grace D.', role: 'Vendeuse de vêtements', rating: 4, quote: "Depuis que je suis sur Vtout, mes ventes ont doublé en 3 mois. Meilleur choix pour mon business !" },
];

const DEFAULT_TERMS = [
  "Vous vous engagez à ne pas divulguer les prix d'achat, les marges de la plateforme, ni les informations des clients finaux.",
  'Vous garantissez que les produits respectent les normes en vigueur.',
  'Les paiements sont effectués sur le numéro Mobile Money renseigné, après confirmation de livraison.',
  'Vous vous engagez à tenir votre stock à jour pour éviter les commandes annulées.',
  "En vous inscrivant, vous acceptez que l'administrateur modère vos produits et fixe le prix de vente final.",
];

export default function SupplierRegisterScreen({ navigation }) {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const { getToken, refreshProfile } = useAuth();
  const { switchSpace } = useSpace();

  const scrollRef = useRef(null);
  const formY = useRef(0);

  const [checkingExisting, setCheckingExisting] = useState(true);
  const [shopName, setShopName] = useState('');
  const [phone, setPhone] = useState('');
  const [momoNumber, setMomoNumber] = useState('');
  const [addressLine, setAddressLine] = useState('');
  const [location, setLocation] = useState(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [signature, setSignature] = useState('');
  const [policies, setPolicies] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const token = await getToken();
        const existing = await getMySupplierProfile(token);
        if (existing) {
          await refreshProfile?.();
          switchSpace('supplier');
          navigation.popToTop();
          return;
        }
      } catch (err) {
        // pas encore fournisseur, ou erreur réseau — on affiche simplement le formulaire
      } finally {
        setCheckingExisting(false);
      }
    })();
    getPoliciesByType('supplier').then(setPolicies).catch(() => setPolicies([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const canSubmit = shopName.trim().length > 1
    && phone.trim().length >= 8
    && momoNumber.trim().length >= 8
    && addressLine.trim().length > 3
    && !!location?.quartier_id
    && termsAccepted
    && signature.trim().length > 1;

  const scrollToForm = () => {
    scrollRef.current?.scrollTo({ y: Math.max(formY.current - 16, 0), animated: true });
  };

  const handleSubmit = async () => {
    if (!canSubmit) {
      Alert.alert('Champs manquants', "Merci de renseigner tous les champs, de préciser votre adresse jusqu'au quartier, et d'accepter les conditions en signant.");
      return;
    }
    setSubmitting(true);
    try {
      const token = await getToken();
      await registerSupplier({
        shopName: shopName.trim(),
        phone: phone.trim(),
        whatsapp: phone.trim(),
        momoNumber: momoNumber.trim(),
        address_line: addressLine.trim(),
        departement_id: location.departement_id,
        departement_label: location.departement_label,
        commune_id: location.commune_id,
        commune_label: location.commune_label,
        quartier_id: location.quartier_id,
        quartier_label: location.quartier_label,
        termsAccepted,
        electronicSignature: signature.trim(),
      }, token);
      await refreshProfile?.();
      switchSpace('supplier');
      Alert.alert('Bienvenue chez Vtout !', 'Votre boutique a été créée. Un membre de notre équipe va valider votre compte.', [
        { text: 'OK', onPress: () => navigation.popToTop() },
      ]);
    } catch (err) {
      Alert.alert('Erreur', err?.response?.data?.error || "Impossible d'envoyer votre inscription.");
    } finally {
      setSubmitting(false);
    }
  };

  if (checkingExisting) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView ref={scrollRef} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* ── Hero ── */}
        <View style={styles.hero}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>La plateforme N°1 des commerçants au Bénin</Text>
          </View>
          <Text style={styles.h1}>
            Vous vendez.{'\n'}
            <Text style={{ color: colors.primary }}>On s'occupe du reste.</Text>{'\n'}
            Vous gagnez plus.
          </Text>
          <Text style={styles.heroSubtitle}>
            Vtout Business est le partenaire technologique des commerçants béninois. Plus de visibilité,
            des ventes sécurisées, des livraisons prises en charge et des paiements rapides sur votre compte.
          </Text>
          <View style={styles.checklistRow}>
            {['Gratuit', 'Sans engagement', 'Prêt en 2 min'].map((t) => (
              <View key={t} style={styles.checklistItem}>
                <Ionicons name="checkmark-circle" size={14} color={colors.success} />
                <Text style={styles.checklistText}>{t}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── Cartes bénéfices ── */}
        <View style={styles.cardGrid}>
          {HERO_CARDS.map((c) => (
            <View key={c.title} style={styles.benefitCard}>
              <View style={styles.benefitIconWrap}>
                <Ionicons name={c.icon} size={17} color={colors.primary} />
              </View>
              <Text style={styles.benefitTitle}>{c.title}</Text>
              <Text style={styles.benefitDesc}>{c.desc}</Text>
            </View>
          ))}
        </View>

        {/* ── Bandeau statistiques ── */}
        <View style={styles.statsBar}>
          {STATS.map((s) => (
            <View key={s.label} style={styles.statItem}>
              <View style={styles.statIconWrap}>
                <Ionicons name={s.icon} size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.statValue}>{s.value}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* ── Problème / Solution ── */}
        <View style={styles.section}>
          <View style={styles.problemBox}>
            <Text style={styles.boxTitle}>Marre de perdre du temps pour peu de résultats ?</Text>
            <Text style={styles.boxSubtitle}>Trop de messages, pas assez de ventes.</Text>
            {PROBLEMS.map((p) => (
              <View key={p} style={styles.listRow}>
                <Ionicons name="close-circle" size={16} color={colors.danger} />
                <Text style={styles.listText}>{p}</Text>
              </View>
            ))}
          </View>

          <View style={styles.solutionBox}>
            <Text style={styles.boxTitle}>
              Avec <Text style={{ color: colors.primary }}>Vtout Business</Text>, votre boutique{' '}
              <Text style={{ color: colors.success }}>travaille pour vous.</Text>
            </Text>
            {SOLUTIONS.map((s) => (
              <View key={s} style={styles.listRow}>
                <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                <Text style={styles.listText}>{s}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── Écosystème ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            L'écosystème conçu pour <Text style={{ color: colors.primary }}>booster vos ventes</Text>
          </Text>
          <View style={styles.ecosystemGrid}>
            {ECOSYSTEM.map((f) => (
              <View key={f.title} style={styles.ecoCard}>
                <View style={styles.benefitIconWrap}>
                  <Ionicons name={f.icon} size={17} color={colors.primary} />
                </View>
                <Text style={styles.ecoTitle}>{f.title}</Text>
                <Text style={styles.benefitDesc}>{f.desc}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── Témoignages ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ils ont rejoint Vtout et leurs ventes ont décollé !</Text>
          {TESTIMONIALS.map((t) => (
            <View key={t.name} style={styles.testimonialCard}>
              <View style={styles.testimonialHead}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{t.name.split(' ').map((w) => w[0]).join('')}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', gap: 2 }}>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Ionicons key={i} name={i < t.rating ? 'star' : 'star-outline'} size={12} color={colors.warning} />
                    ))}
                  </View>
                  <Text style={styles.testimonialName}>{t.name}</Text>
                  <Text style={styles.testimonialRole}>{t.role}</Text>
                </View>
              </View>
              <Text style={styles.testimonialQuote}>« {t.quote} »</Text>
            </View>
          ))}
        </View>

        {/* ── Bandeau CTA ── */}
        <View style={styles.ctaBanner}>
          <Text style={styles.ctaTitle}>Rejoignez dès aujourd'hui l'élite des marchands au Bénin.</Text>
          <Text style={styles.ctaSubtitle}>L'inscription est 100% gratuite, rapide et sans engagement.</Text>
          <Pressable style={styles.ctaButton} onPress={scrollToForm}>
            <Text style={styles.ctaButtonText}>Créer ma boutique gratuitement</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.primary} />
          </Pressable>
        </View>

        {/* ── Formulaire d'inscription ── */}
        <View onLayout={(e) => { formY.current = e.nativeEvent.layout.y; }} style={styles.formSection}>
          <View style={styles.iconWrap}>
            <Ionicons name="storefront" size={30} color={colors.primary} />
          </View>
          <Text style={styles.title}>Devenez vendeur Vtout</Text>
          <Text style={styles.subtitle}>Renseignez les informations de votre boutique pour commencer à vendre.</Text>

          <View style={styles.form}>
            <Text style={styles.label}>Nom de la boutique</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: Ma Belle Boutique"
              placeholderTextColor={colors.textFaint}
              value={shopName}
              onChangeText={setShopName}
            />

            <Text style={styles.label}>Téléphone / WhatsApp</Text>
            <TextInput
              style={styles.input}
              placeholder="Recevez vos alertes commandes ici"
              placeholderTextColor={colors.textFaint}
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
            />

            <Text style={styles.label}>Numéro Mobile Money (MoMo)</Text>
            <TextInput
              style={styles.input}
              placeholder="Pour recevoir vos paiements après livraison"
              placeholderTextColor={colors.textFaint}
              keyboardType="phone-pad"
              value={momoNumber}
              onChangeText={setMomoNumber}
            />

            <Text style={styles.label}>Zone</Text>
            <LocationPicker value={location} onChange={setLocation} />

            <Text style={styles.label}>Description précise de l'adresse</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: Face pharmacie du peuple, 1er bâtiment rouge"
              placeholderTextColor={colors.textFaint}
              value={addressLine}
              onChangeText={setAddressLine}
            />

            <View style={styles.termsBox}>
              <Text style={styles.termsTitle}>Conditions du programme Fournisseur</Text>
              {policies.length > 0 ? (
                policies.map((p) => (
                  <View key={p.id} style={{ marginBottom: 10 }}>
                    <Text style={styles.termsItemTitle}>{p.title}</Text>
                    <Text style={styles.termsText}>{p.content}</Text>
                  </View>
                ))
              ) : (
                DEFAULT_TERMS.map((t, idx) => (
                  <Text key={idx} style={styles.termsText}>• {t}</Text>
                ))
              )}
            </View>

            <Pressable style={styles.checkboxRow} onPress={() => setTermsAccepted((v) => !v)}>
              <View style={[styles.checkbox, termsAccepted && styles.checkboxActive]}>
                {termsAccepted && <Ionicons name="checkmark" size={14} color="#fff" />}
              </View>
              <Text style={styles.checkboxLabel}>J'ai lu et j'accepte les termes du contrat ci-dessus.</Text>
            </Pressable>

            <Text style={styles.label}>Signature électronique</Text>
            <TextInput
              style={styles.input}
              placeholder="Tapez votre nom complet pour signer..."
              placeholderTextColor={colors.textFaint}
              value={signature}
              onChangeText={setSignature}
            />

            <Button title="Envoyer ma candidature" onPress={handleSubmit} loading={submitting} disabled={!canSubmit} style={{ marginTop: 8 }} />
          </View>
        </View>

        <Text style={styles.footerNote}>
          © {new Date().getFullYear()} Vtout Marketplace. Plateforme de vente réservée aux professionnels.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scrollContent: { paddingBottom: 40 },

  hero: { padding: 24, alignItems: 'center', gap: 14 },
  badge: {
    backgroundColor: `${colors.primary}15`, paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: radius.full,
  },
  badgeText: { fontSize: 10, fontWeight: '900', color: colors.primary, textTransform: 'uppercase', letterSpacing: 0.6, textAlign: 'center' },
  h1: { fontSize: 26, fontWeight: '900', color: colors.text, textAlign: 'center', lineHeight: 32 },
  heroSubtitle: { fontSize: 13.5, color: colors.textMuted, fontWeight: '600', textAlign: 'center', lineHeight: 20 },
  checklistRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 14, marginTop: 4 },
  checklistItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  checklistText: { fontSize: 11.5, fontWeight: '800', color: colors.textMuted },

  cardGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 10 },
  benefitCard: {
    flexBasis: '47%', flexGrow: 1, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.lg, padding: 14, gap: 6,
  },
  benefitIconWrap: {
    width: 34, height: 34, borderRadius: 12, backgroundColor: `${colors.primary}15`,
    alignItems: 'center', justifyContent: 'center',
  },
  benefitTitle: { fontSize: 12, fontWeight: '900', color: colors.text, lineHeight: 16 },
  benefitDesc: { fontSize: 10.5, fontWeight: '600', color: colors.textFaint, lineHeight: 15 },

  statsBar: {
    marginTop: 22, backgroundColor: colors.navy, paddingVertical: 22, paddingHorizontal: 18,
    flexDirection: 'row', flexWrap: 'wrap', gap: 16,
  },
  statItem: { flexBasis: '45%', flexGrow: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  statIconWrap: {
    width: 38, height: 38, borderRadius: 14, backgroundColor: `${colors.primary}25`,
    alignItems: 'center', justifyContent: 'center',
  },
  statValue: { fontSize: 15, fontWeight: '900', color: '#fff' },
  statLabel: { fontSize: 9.5, fontWeight: '700', color: 'rgba(255,255,255,0.6)', marginTop: 1 },

  section: { padding: 20, gap: 14 },
  sectionTitle: { fontSize: 18, fontWeight: '900', color: colors.text, textAlign: 'center', lineHeight: 24 },

  problemBox: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.lg, padding: 18, gap: 12,
  },
  solutionBox: {
    backgroundColor: `${colors.success}10`, borderWidth: 1, borderColor: `${colors.success}30`,
    borderRadius: radius.lg, padding: 18, gap: 12,
  },
  boxTitle: { fontSize: 16, fontWeight: '900', color: colors.text, lineHeight: 22 },
  boxSubtitle: { fontSize: 11.5, fontWeight: '700', color: colors.textFaint, marginTop: -6 },
  listRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 9 },
  listText: { flex: 1, fontSize: 12.5, fontWeight: '700', color: colors.textMuted, lineHeight: 18 },

  ecosystemGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  ecoCard: {
    flexBasis: '47%', flexGrow: 1, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.lg, padding: 14, gap: 6,
  },
  ecoTitle: { fontSize: 12, fontWeight: '900', color: colors.text },

  testimonialCard: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.lg, padding: 16, gap: 10,
  },
  testimonialHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: `${colors.primary}15`,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 13, fontWeight: '900', color: colors.primary },
  testimonialName: { fontSize: 12, fontWeight: '900', color: colors.text, marginTop: 2 },
  testimonialRole: { fontSize: 10.5, fontWeight: '700', color: colors.textFaint },
  testimonialQuote: { fontSize: 12.5, fontWeight: '600', color: colors.textMuted, lineHeight: 18, fontStyle: 'italic' },

  ctaBanner: {
    margin: 20, backgroundColor: colors.primary, borderRadius: radius.xl, padding: 22, gap: 10, alignItems: 'center',
  },
  ctaTitle: { fontSize: 17, fontWeight: '900', color: '#fff', textAlign: 'center', lineHeight: 22 },
  ctaSubtitle: { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.85)', textAlign: 'center' },
  ctaButton: {
    marginTop: 6, backgroundColor: '#fff', paddingHorizontal: 20, paddingVertical: 13, borderRadius: radius.md,
    flexDirection: 'row', alignItems: 'center', gap: 6,
  },
  ctaButtonText: { fontSize: 11.5, fontWeight: '900', color: colors.primary, textTransform: 'uppercase', letterSpacing: 0.3 },

  formSection: { padding: 24, alignItems: 'center', borderTopWidth: 1, borderTopColor: colors.border },
  iconWrap: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#fff1e8', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  title: { fontSize: 20, fontWeight: '900', color: colors.text, textAlign: 'center' },
  subtitle: { fontSize: 13, color: colors.textMuted, fontWeight: '600', textAlign: 'center', marginTop: 8, marginBottom: 24 },
  form: { width: '100%', gap: 10 },
  label: { fontSize: 11.5, fontWeight: '800', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.4, marginTop: 6, marginBottom: 2 },
  input: {
    height: 52, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, paddingHorizontal: 16, fontSize: 14, fontWeight: '600', color: colors.text,
  },
  termsBox: {
    marginTop: 14, padding: 16, borderRadius: radius.lg, backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border, maxHeight: 220,
  },
  termsTitle: { fontSize: 12.5, fontWeight: '900', color: colors.text, marginBottom: 8, textTransform: 'uppercase' },
  termsItemTitle: { fontSize: 12, fontWeight: '800', color: colors.text, marginBottom: 2 },
  termsText: { fontSize: 11.5, color: colors.textMuted, fontWeight: '600', lineHeight: 17, marginBottom: 4 },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 },
  checkbox: {
    width: 24, height: 24, borderRadius: 7, borderWidth: 2, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface,
  },
  checkboxActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  checkboxLabel: { flex: 1, fontSize: 12, fontWeight: '700', color: colors.text },

  footerNote: { textAlign: 'center', fontSize: 9.5, fontWeight: '800', color: colors.textFaint, textTransform: 'uppercase', letterSpacing: 0.4, paddingHorizontal: 30, marginTop: 4 },
});
