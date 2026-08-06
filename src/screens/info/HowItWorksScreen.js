import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { radius } from '../../theme/colors';
import { useTheme } from '../../context/ThemeContext';

// ---------------------------------------------------------------------------
// Miroir de frontend/src/pages/HowItWorks/HowItWorksPage.jsx : mêmes 6
// parcours (rôles + avantages), mêmes étapes/textes. Le sélecteur d'onglets
// web (groupé Rôles / Avantages) devient deux rangées de puces ici ; le CTA
// externe "Ouvrir ma boutique" (portail vendeur web) devient un lien interne
// vers l'écran d'inscription vendeur natif, puisque l'app a son propre flux.
// ---------------------------------------------------------------------------

const USER_TYPES = {
  acheteur: {
    label: 'Acheteur', emoji: '🛍️',
    description: 'Découvrez comment acheter facilement sur Vtout',
    ctaLabel: 'Explorer la marketplace', ctaRoute: 'ProductsList',
    ctaText: 'Des milliers de produits vous attendent !',
    steps: [
      { icon: 'search', title: 'Explorez les produits', text: "Parcourez des milliers de produits de vendeurs vérifiés à travers tout le Bénin. Filtrez par catégorie, prix ou ville." },
      { icon: 'bag', title: 'Ajoutez au panier', text: 'Sélectionnez vos articles, choisissez la quantité et ajoutez-les à votre panier en un clic.' },
      { icon: 'card', title: 'Passez votre commande', text: 'Renseignez votre adresse de livraison et confirmez votre commande. Paiement à la réception — aucun risque.' },
      { icon: 'car', title: 'Suivez votre livraison', text: 'Un livreur prend en charge votre commande. Vous recevez des notifications WhatsApp à chaque étape.' },
      { icon: 'cube', title: 'Recevez votre colis', text: 'Votre commande arrive à votre porte. Vérifiez le contenu avant de payer. Satisfaction garantie.' },
      { icon: 'star', title: 'Donnez votre avis', text: 'Notez le vendeur et le produit pour aider la communauté. Vos retours améliorent la plateforme.' },
    ],
  },
  livreur: {
    label: 'Livreur', emoji: '🚚',
    description: "Gagnez de l'argent en livrant des commandes près de chez vous",
    ctaLabel: 'Devenir livreur', ctaRoute: 'BecomeDelivery',
    ctaText: 'Rejoignez notre équipe et commencez à gagner dès aujourd\'hui !',
    steps: [
      { icon: 'person-add', title: 'Inscrivez-vous', text: 'Créez votre compte livreur depuis « Devenir livreur ». Renseignez vos informations et votre zone de travail.' },
      { icon: 'notifications', title: 'Recevez des missions', text: "Dès qu'une commande est disponible dans votre zone, vous êtes notifié. Acceptez selon vos disponibilités." },
      { icon: 'navigate', title: 'Récupérez la commande', text: "Rendez-vous chez le vendeur pour récupérer le colis. L'adresse et les détails du vendeur vous sont communiqués." },
      { icon: 'location', title: 'Livrez le client', text: 'Déposez le colis à l\'adresse du client. Une fois confirmée, la commande est marquée « livrée ».' },
      { icon: 'wallet', title: 'Soyez payé', text: 'Vos gains sont automatiquement crédités sur votre portefeuille Vtout après chaque livraison réussie.' },
    ],
  },
  vendeur: {
    label: 'Vendeur', emoji: '🏪',
    description: 'Vendez vos produits à des milliers de clients partout au Bénin',
    ctaLabel: 'Ouvrir ma boutique', ctaRoute: 'SupplierRegister',
    ctaText: 'Ouvrez votre boutique et vendez partout au Bénin !',
    steps: [
      { icon: 'storefront', title: 'Créez votre boutique', text: 'Inscrivez-vous depuis « Devenir vendeur ». Complétez votre profil avec votre logo, description et coordonnées.' },
      { icon: 'cloud-upload', title: 'Ajoutez vos produits', text: 'Publiez vos articles avec photos, description et prix vendeur. Vtout calcule automatiquement le prix client final.' },
      { icon: 'notifications', title: 'Recevez les commandes', text: 'Lorsqu\'un client commande vos produits, vous êtes notifié instantanément par WhatsApp et sur votre tableau de bord.' },
      { icon: 'paper-plane', title: 'Remettez au livreur', text: "Préparez le colis et remettez-le au livreur assigné. Il s'occupe de la livraison jusqu'au client final." },
      { icon: 'cash', title: 'Touchez vos gains', text: 'Après chaque livraison réussie, vos gains nets sont crédités sur votre portefeuille automatiquement.' },
      { icon: 'stats-chart', title: 'Gérez votre activité', text: 'Suivez vos ventes, revenus et statistiques en temps réel depuis votre tableau de bord vendeur.' },
    ],
  },
  distributeur: {
    label: 'Distributeur', emoji: '📢',
    description: 'Publiez les campagnes Vtout en Statut WhatsApp et gagnez selon vos vues',
    ctaLabel: 'Devenir distributeur', ctaRoute: 'Distribution',
    ctaText: 'Publiez, gagnez en FCFA selon vos vues, et retirez sur Mobile Money !',
    steps: [
      { icon: 'chatbubble', title: 'Vérifiez votre compte', text: 'Confirmez votre numéro WhatsApp par code reçu et renseignez votre numéro Mobile Money pour être payé.' },
      { icon: 'megaphone', title: 'Réclamez une campagne', text: 'Choisissez une campagne publiée par Vtout parmi celles disponibles dans votre espace distributeur.' },
      { icon: 'paper-plane', title: 'Publiez en Statut', text: "Postez le visuel en Statut WhatsApp et envoyez une 1ère capture d'écran dans l'heure qui suit." },
      { icon: 'eye', title: 'Capture finale + vues', text: 'Juste avant les 24h, envoyez une 2nde capture avec le nombre de vues affiché sous votre Statut.' },
      { icon: 'wallet', title: 'Soyez payé', text: 'Après vérification par notre équipe, vous êtes payé selon le nombre de vues validées, sur votre Mobile Money.' },
    ],
  },
  parrainage: {
    label: 'Parrainage', emoji: '🎁',
    description: 'Invitez vos proches et gagnez des récompenses en FCFA',
    ctaLabel: 'Voir mon lien de parrainage', ctaRoute: 'Referral',
    ctaText: 'Partagez votre lien et gagnez à chaque nouvel ami qui commande !',
    steps: [
      { icon: 'share-social', title: 'Partagez votre lien', text: 'Depuis votre tableau de bord, récupérez votre code personnel et partagez-le par WhatsApp, Facebook ou en le copiant.' },
      { icon: 'person-add', title: "Un proche s'inscrit", text: 'Votre filleul crée son compte Vtout en utilisant votre lien ou votre code au moment de l\'inscription.' },
      { icon: 'gift', title: 'Il reçoit un cadeau de bienvenue', text: 'Votre filleul reçoit automatiquement une récompense de bienvenue dès son inscription.' },
      { icon: 'cube', title: 'Il passe sa 1ère commande', text: 'Dès que sa première commande est confirmée et livrée, le parrainage est validé.' },
      { icon: 'wallet', title: 'Vous êtes récompensé', text: 'Votre récompense est automatiquement créditée sur votre portefeuille Vtout — sans limite du nombre de filleuls.' },
    ],
  },
  coupons: {
    label: 'Coupon', emoji: '🏷️',
    description: 'Comprenez les codes promo et profitez de vos réductions',
    ctaLabel: 'Voir les promotions', ctaRoute: 'Promotions',
    ctaText: 'Ne manquez plus jamais une réduction disponible pour vous !',
    steps: [
      { icon: 'ticket', title: 'Trouvez un code', text: "Codes de bienvenue, promotions ponctuelles ou code personnel reçu par parrainage — plusieurs façons d'en obtenir un." },
      { icon: 'pricetags', title: 'Plusieurs types de réduction', text: 'Pourcentage sur le panier, montant fixe, livraison gratuite ou réduction limitée à une catégorie de produits.' },
      { icon: 'card', title: 'Entrez-le au paiement', text: 'Au moment de valider votre commande, saisissez le code dans le champ « Code promo » et validez.' },
      { icon: 'sparkles', title: 'La réduction s\'applique', text: 'Le montant est immédiatement recalculé — remise sur le panier ou frais de livraison offerts selon le coupon.' },
      { icon: 'pricetag', title: 'Vérifiez les conditions', text: 'Chaque code a ses règles : montant minimum, catégorie concernée, date de validité ou usage unique par client.' },
    ],
  },
};

const TAB_GROUPS = [
  { label: 'Rôles', keys: ['acheteur', 'livreur', 'vendeur', 'distributeur'] },
  { label: 'Avantages', keys: ['parrainage', 'coupons'] },
];

export default function HowItWorksScreen({ route, navigation }) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const initialTab = USER_TYPES[route?.params?.tab] ? route.params.tab : 'acheteur';
  const [tab, setTab] = useState(initialTab);
  const active = USER_TYPES[tab];

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        <View style={styles.hero}>
          <Text style={styles.emoji}>{active.emoji}</Text>
          <Text style={styles.title}>Pour les {active.label}s</Text>
          <Text style={styles.description}>{active.description}</Text>
        </View>

        <View style={styles.tabGroups}>
          {TAB_GROUPS.map((group) => (
            <View key={group.label} style={styles.tabGroupRow}>
              {group.keys.map((key) => {
                const t = USER_TYPES[key];
                const isActive = key === tab;
                return (
                  <Pressable
                    key={key}
                    style={[styles.tabChip, isActive && styles.tabChipActive]}
                    onPress={() => setTab(key)}
                  >
                    <Text style={styles.tabChipEmoji}>{t.emoji}</Text>
                    <Text style={[styles.tabChipText, isActive && styles.tabChipTextActive]}>{t.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>

        <View style={{ padding: 16, gap: 12 }}>
          {active.steps.map((step, idx) => (
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
        </View>

        <View style={styles.ctaBanner}>
          <Text style={styles.ctaTitle}>Prêt à commencer ?</Text>
          <Text style={styles.ctaText}>{active.ctaText}</Text>
          <Pressable style={styles.ctaBtn} onPress={() => navigation.navigate(active.ctaRoute)}>
            <Text style={styles.ctaBtnText}>{active.ctaLabel}</Text>
            <Ionicons name="arrow-forward" size={16} color={colors.primary} />
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  hero: { alignItems: 'center', padding: 24, paddingBottom: 8, gap: 6 },
  emoji: { fontSize: 44 },
  title: { fontSize: 22, fontWeight: '900', color: colors.text, textAlign: 'center' },
  description: { fontSize: 12.5, fontWeight: '600', color: colors.textMuted, textAlign: 'center', lineHeight: 18 },
  tabGroups: { paddingHorizontal: 16, paddingTop: 14, gap: 8 },
  tabGroupRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
  tabChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 13, paddingVertical: 8,
    borderRadius: radius.full, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
  },
  tabChipActive: { backgroundColor: colors.text, borderColor: colors.text },
  tabChipEmoji: { fontSize: 12 },
  tabChipText: { fontSize: 11, fontWeight: '800', color: colors.textMuted },
  tabChipTextActive: { color: colors.background },
  stepCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: 14 },
  stepNumberWrap: { width: 20 },
  stepNumber: { fontSize: 16, fontWeight: '900', color: colors.border },
  stepIcon: { width: 40, height: 40, borderRadius: 14, backgroundColor: `${colors.primary}18`, alignItems: 'center', justifyContent: 'center' },
  stepTitle: { fontSize: 13.5, fontWeight: '800', color: colors.text },
  stepText: { fontSize: 11.5, color: colors.textMuted, fontWeight: '500', marginTop: 2, lineHeight: 16 },
  ctaBanner: {
    margin: 16, marginTop: 4, backgroundColor: colors.primary, borderRadius: radius.xl, padding: 22,
    alignItems: 'center', gap: 8,
  },
  ctaTitle: { fontSize: 17, fontWeight: '900', color: '#fff', textAlign: 'center' },
  ctaText: { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.85)', textAlign: 'center' },
  ctaBtn: {
    marginTop: 6, backgroundColor: '#fff', paddingHorizontal: 20, paddingVertical: 13, borderRadius: radius.md,
    flexDirection: 'row', alignItems: 'center', gap: 6,
  },
  ctaBtnText: { fontSize: 11.5, fontWeight: '900', color: colors.primary, textTransform: 'uppercase', letterSpacing: 0.3 },
});
