# Vtout Mobile (Expo / React Native)

Point de départ pour la version mobile de Vtout, avec la logique métier de ton
backend réutilisée telle quelle (services API) et un design repensé pour le mobile.

## Démarrer

```bash
npm install
npx expo start
```

Scanne le QR code avec l'app **Expo Go** (Android/iOS), ou lance un simulateur.

## ⚠️ À configurer avant de lancer

1. **URL de l'API** — dans `app.json`, remplace :
   ```
   "extra": { "apiUrl": "https://TON_BACKEND_EN_LIGNE.com/api" }
   ```
   par l'URL de ton backend déjà en ligne (celui de `server/`).

2. **Authentification** — ton site utilise **better-auth** (voir
   `frontend/src/lib/auth-client.js` sur le repo web), pas Clerk. J'ai mis en
   place un `AuthContext` minimal qui appelle `/auth/sign-in/email` et
   `/auth/sign-up/email`. Vérifie dans `server/index.js` / `server/routes`
   les routes exactes exposées par better-auth chez toi, et adapte
   `src/context/AuthContext.js` en conséquence. Pour une intégration
   robuste (gestion cookies/session), le client officiel Expo de better-auth
   est recommandé : https://www.better-auth.com/docs/integrations/expo

## Ce qui est déjà fait

- **Logique métier portée telle quelle** (`src/services/`) : produits,
  panier, commandes, config, favoris, coupons, livraison, avis, utilisateur,
  adresses — copiés depuis ton `frontend/src/services`, seul l'import du
  client API a changé.
- **Contexte Panier** (`src/context/CartContext.js`) : même comportement que
  sur le site (panier serveur si connecté, panier local sinon), avec
  `AsyncStorage` à la place de `localStorage`.
- **Client API** (`src/api/client.js`) : axios + injection automatique du
  token dans les headers (remplace les cookies `withCredentials` du web).
- **Navigation** : tabs (Accueil / Panier / Profil) + stack pour le détail
  produit et la recherche.
- **Écrans** : Accueil (catégories + grille produits), Recherche, Détail
  produit, Panier, Profil — design mobile natif, couleur de marque orange
  (`#f97316`) reprise du site.

## Prochaines étapes suggérées

1. Brancher l'auth réelle (better-auth) + écrans Connexion/Inscription.
2. Écran Checkout (adresse, mode de livraison, paiement — `deliveryService`,
   `couponService` déjà portés).
3. Écran Mes commandes (`orderService`) et Favoris (`favoriteService`).
4. Notifications push (le site a `notificationService` + `socketService` —
   `socket.io-client` fonctionne aussi en RN).
5. Portail fournisseur (`supplier-portal/`) en tant que 2ᵉ app RN, ou section
   dédiée dans la même app selon ce que tu préfères.

Dis-moi quel écran tu veux qu'on construise ensuite.
# vtout-mobile-app
