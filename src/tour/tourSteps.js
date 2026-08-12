// Contenu des visites guidées — chaque `target` doit correspondre à un id
// posé sur un <TourAnchor id="..."> quelque part dans l'arbre de l'écran
// concerné (voir HomeScreen.js et TabNavigator.js pour l'espace acheteur).
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
