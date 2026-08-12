// Contenu des visites guidées — chaque `target` doit correspondre à un id
// posé sur un <TourAnchor id="..."> quelque part dans l'arbre de l'écran
// concerné (voir HomeScreen.js et TabNavigator.js pour l'espace acheteur,
// {Supplier,Delivery,Admin}Navigator.js pour les autres espaces).
export const HOME_TOUR_STEPS = [
  {
    target: 'tour-search',
    title: 'Trouvez ce que vous cherchez',
    description: "Recherchez n'importe quel produit, boutique ou catégorie en un instant.",
  },
  {
    target: 'tour-categories',
    title: 'Parcourez les catégories',
    description: 'Toutes les familles de produits sont classées ici pour naviguer facilement.',
  },
  {
    target: 'tour-tab-panier',
    title: 'Votre panier',
    description: 'Retrouvez à tout moment les articles que vous avez ajoutés, avec le total à jour.',
  },
  {
    target: 'tour-tab-profil',
    title: 'Votre espace personnel',
    description: 'Vos commandes, adresses, favoris — et devenez vendeur ou livreur directement depuis ici.',
  },
];

export const SUPPLIER_TOUR_STEPS = [
  {
    target: 'tour-supplier-tab-dashboard',
    title: 'Votre tableau de bord',
    description: 'Un coup d\'œil sur vos ventes, vos alertes stock et vos dernières commandes.',
  },
  {
    target: 'tour-supplier-tab-orders',
    title: 'Vos commandes',
    description: 'Suivez et mettez à jour le statut de chaque commande reçue.',
  },
  {
    target: 'tour-supplier-tab-products',
    title: 'Vos produits',
    description: 'Ajoutez de nouveaux articles et gérez votre catalogue.',
  },
  {
    target: 'tour-supplier-tab-wallet',
    title: 'Votre portefeuille',
    description: 'Vos gains sont crédités ici après chaque livraison réussie — demandez un retrait à tout moment.',
  },
];

export const DELIVERY_TOUR_STEPS = [
  {
    target: 'tour-delivery-tab-home',
    title: 'Votre accueil livreur',
    description: 'Votre statut (en ligne/hors ligne), vos statistiques et vos alertes du jour.',
  },
  {
    target: 'tour-delivery-tab-available',
    title: 'Commandes disponibles',
    description: 'Les livraisons à prendre en charge dans votre zone apparaissent ici.',
  },
  {
    target: 'tour-delivery-tab-mine',
    title: 'Mes livraisons',
    description: 'Suivez vos livraisons en cours et confirmez-les avec le code client.',
  },
];

export const ADMIN_TOUR_STEPS = [
  {
    target: 'tour-admin-tab-dashboard',
    title: 'Tableau de bord',
    description: "Vue d'ensemble : ventes, commandes récentes, alertes stock.",
  },
  {
    target: 'tour-admin-tab-orders',
    title: 'Commandes',
    description: 'Toutes les commandes de la plateforme, avec changement de statut.',
  },
  {
    target: 'tour-admin-tab-approvals',
    title: 'Validations',
    description: 'Vendeurs et produits en attente de validation avant mise en ligne.',
  },
  {
    target: 'tour-admin-tab-users',
    title: 'Utilisateurs',
    description: "Gérez l'ensemble des comptes de la plateforme.",
  },
  {
    target: 'tour-admin-tab-disputes',
    title: 'Litiges',
    description: 'Retours et réclamations client à traiter.',
  },
  {
    target: 'tour-admin-tab-hub',
    title: 'Tout le reste',
    description: 'Produits, catalogue, blog, configuration, géographie... tout le back-office est accessible ici.',
  },
];
