# Vtout Mobile (Expo / React Native)

Application mobile de Vtout, avec la même logique métier que le site web
(mêmes endpoints API, mêmes règles de prix/livraison/panier) mais un design
entièrement repensé pour une app native (tabs, écrans plein écran, gestes
natifs).

## Démarrer

```bash
npm install
npx expo start
```

Scanne le QR code avec l'app **Expo Go** (Android/iOS), ou lance un simulateur
(`npx expo start --ios` / `--android`).

## Configuration

L'URL de l'API backend est définie dans `app.json` (`expo.extra.apiUrl`) :

```json
"extra": { "apiUrl": "https://api.vtout.com/api" }
```

C'est déjà pointé vers le backend en production. Pour tester en local contre
un serveur `server/` lancé sur ta machine, remplace temporairement par
`http://<IP_DE_TA_MACHINE>:3000/api` (pas `localhost`, un appareil/simulateur
ne peut pas l'atteindre).

## Authentification

Le backend utilise **better-auth**. L'app appelle directement les endpoints
REST (`/auth/sign-in/email`, `/auth/sign-up/email`, `/auth/get-session`,
`/auth/sign-out`, `/auth/forget-password`) — pas besoin du SDK client
`better-auth/react` (pensé pour le navigateur).

Deux mécanismes de session cohabitent, comme le fait `authMiddleware.js`
côté serveur :
- le **cookie de session**, posé automatiquement par la requête de
  connexion et rejoué par le client HTTP natif (`withCredentials: true`) ;
- un **jeton Bearer** de secours (l'`id` de la session, récupéré via
  `/auth/get-session`), stocké dans `expo-secure-store` et injecté dans le
  header `Authorization` de chaque requête — c'est exactement le
  mécanisme de compatibilité déjà utilisé par le site web
  (`session.id` dans `AuthHooks.jsx`).

Voir `src/context/AuthContext.js`.

## Structure du code

- `src/api/client.js` — instance axios (baseURL, injection du token).
- `src/services/` — services métier portés depuis `frontend/src/services`
  (produits, panier, commandes, favoris, coupons, adresses, avis, config,
  localisation) : mêmes signatures, seul le client HTTP change.
- `src/context/AuthContext.js` — session, connexion/inscription/déconnexion,
  profil enrichi (rôle).
- `src/context/CartContext.js` — panier serveur si connecté, sinon panier
  local (`AsyncStorage`) — même comportement que le site.
- `src/navigation/` — `TabNavigator` (Accueil / Catégories / Panier / Profil)
  + `RootNavigator` (stack pour le détail produit, la recherche, le
  checkout, les commandes, les favoris, les adresses, l'auth).
- `src/screens/` — tous les écrans de l'app.
- `src/components/` — `ProductCard`, `LocationPicker` (sélection de
  quartier avec repli sur les données locales embarquées), `Button`,
  `EmptyState`, `Loading`.

## Fonctionnalités portées

- Accueil (catégories + grille produits), recherche, liste par catégorie.
- Fiche produit : galerie d'images, variantes/attributs, favoris, ajout au
  panier, achat immédiat, produits similaires.
- Panier (serveur/local), quantités, suppression.
- Checkout : adresse (recherche de quartier, Bénin), calcul du supplément
  de livraison (même logique intra/inter-département que le site), coupon
  de réduction, paiement à la livraison ou en ligne (FedaPay, ouvert dans
  le navigateur système via `expo-web-browser`).
- Mes commandes / détail de commande, mes favoris, mes adresses.
- Connexion / inscription / mot de passe oublié.

## Prochaines étapes suggérées

1. Écran d'avis produits (lecture + dépôt d'un avis) — `reviewService` est
   déjà porté.
2. Notifications push (le site a un `notificationService` +
   `socket.io-client`, compatible React Native).
3. Portail fournisseur / espace livreur : hors périmètre de cette app
   grand public, à traiter comme une app (ou section) dédiée si besoin.
4. Icônes/splash de production (`assets/`) — ceux fournis sont des
   placeholders Expo par défaut.
