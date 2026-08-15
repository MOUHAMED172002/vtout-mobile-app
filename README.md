# Vtout Mobile (Expo / React Native)

Application mobile de Vtout, avec la même logique métier que le site web
(mêmes endpoints API, mêmes règles de prix/livraison/panier) mais un design
entièrement repensé pour une app native (tabs, écrans plein écran, gestes
natifs).

## Plateformes ciblées

**Lancement Android uniquement pour le moment.** Le code reste multi-plateforme
(rien n'a été retiré), mais la priorité est au build/soumission Android — voir
`eas.json`/`eas build --platform android`. Conséquences concrètes :

- `ios.appleTeamId` (nécessaire pour signer un build iOS) n'est **pas**
  requis tant qu'on ne construit pas pour iOS.
- `extra.googleIosClientId` peut rester vide — seul
  `extra.googleAndroidClientId` est nécessaire pour activer la connexion
  Google (voir § Configuration ci-dessous).
- Le widget iOS (`targets/widget/`, plugin `@bacons/apple-targets`) reste en
  place dans le code mais est **en pause** : il ne compile que lors d'un
  build iOS, qu'on ne lance pas pour l'instant. Voir § Widgets pour reprendre
  ce chantier plus tard.

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

### Espace client
- Accueil (catégories + grille produits), recherche, liste par catégorie.
- Fiche produit : galerie d'images, variantes/attributs, favoris, ajout au
  panier, achat immédiat, produits similaires.
- Panier (serveur/local), quantités, suppression.
- Checkout : adresse (recherche de quartier, Bénin), calcul du supplément
  de livraison (même logique intra/inter-département que le site), coupon
  de réduction, paiement à la livraison ou en ligne (FedaPay, ouvert dans
  le navigateur système via `expo-web-browser`).
- Mes commandes / détail de commande, mes favoris, mes adresses.
- Avis produits : lecture (fiche produit → "Voir tous les avis"), dépôt
  d'un avis avec note/commentaire/photos (jusqu'à 3) depuis une commande
  livrée, "Mes avis" (suppression).
- Notifications : liste persistée (`/notifications/me`) + temps réel via
  `socket.io-client` (mêmes événements que le site : `order_status_updated`,
  `new_message`, `admin_notification`) **+ push OS** (voir section dédiée
  ci-dessous). Cloche avec badge sur l'accueil et dans l'en-tête de chaque
  espace pro.
- Connexion / inscription / mot de passe oublié.

### Espace vendeur (`src/screens/supplier/`, `SupplierNavigator`)
Porté depuis le vrai portail vendeur web (`supplier-portal/`, une app
séparée — pas `frontend/src/component/Supplier` qui est du code mort côté
web). Tableau de bord, commandes reçues (changement de statut), produits
(liste, création/édition, activation), portefeuille (solde, historique,
demande de retrait), boutiques, inscription vendeur.

### Espace livreur (`src/screens/delivery/`, `DeliveryNavigator`)
Porté depuis `frontend/src/component/Delivery/`. Bascule en/hors service,
commandes disponibles (filtrables par commune — pas de carte interactive,
contrairement au web qui utilise mapbox), mes livraisons en cours (statut,
code de confirmation de livraison, appel client), historique, caisse non
reversée, candidature livreur (KYC : pièce d'identité, véhicule, zones de
service).

### Espace admin simplifié (`src/screens/admin/`, `AdminNavigator`)
Le back-office web fait 64 écrans (paramètres système, finance détaillée,
CMS blog/FAQ, géographie...) — volontairement **hors périmètre mobile**,
ça reste sur le site. L'app couvre : tableau de bord (stats clés, alertes
stock, commandes récentes), commandes (changement de statut), validation
rapide des vendeurs/produits en attente, utilisateurs (activer/désactiver),
litiges.

### Bascule entre espaces
Un compte peut cumuler plusieurs rôles (ex: client + vendeur). Le bouton
en haut à droite de chaque espace (`SpaceSwitcherButton`) permet de
basculer, et l'onglet Profil propose "Devenir vendeur" / "Devenir livreur"
pour les comptes qui n'ont pas encore ces rôles. Voir
`src/context/SpaceContext.js`.

## Notifications push (OS)

En plus du temps réel en app ouverte, l'app envoie de vraies notifications
push (bannière système, appli fermée ou en arrière-plan), via le service
push d'Expo. Ça touche **deux dépôts** :

- **Mobile** (`src/services/pushService.js`) : demande la permission,
  récupère le jeton push Expo de l'appareil, l'enregistre côté serveur.
  Écran Notifications ouvert automatiquement au tap sur la notification
  (`src/components/PushNotificationListener.js`).
- **Serveur** (`server/`) : jeton stocké dans `profiles.metadata.expo_push_tokens`
  (pas de migration de schéma). Chaque notification déjà créée en base
  (`Notification.create(...)`, ~10 endroits dans le code : commandes,
  litiges, finance...) déclenche automatiquement un envoi push via un hook
  Sequelize `afterCreate` (`server/models/Notification.js` →
  `server/services/pushNotificationService.js`) — **aucun des call sites
  existants n'a été modifié**. Endpoints ajoutés :
  `POST /profiles/push-token` (enregistrer), `DELETE /profiles/push-token`
  (retirer — appelé automatiquement à la déconnexion).

### ⚠️ Prérequis pour tester : build EAS, pas Expo Go

Depuis le SDK 53, **Expo Go ne supporte plus les notifications push
distantes** sur Android/iOS. Pour tester cette fonctionnalité :

1. `npx eas init` (crée un projet EAS, nécessite un compte Expo gratuit) —
   ça remplit automatiquement `extra.eas.projectId` dans `app.json`. Sans
   ce `projectId`, `pushService.js` désactive silencieusement
   l'enregistrement (log d'avertissement, pas de crash).
2. `npx eas build --profile development --platform android` (ou `ios`)
   pour générer un build de développement, à installer sur un appareil
   physique (le simulateur iOS ne reçoit pas de vrais push).
3. Le reste de l'app (achats, espaces vendeur/livreur/admin) fonctionne
   normalement dans Expo Go — seul le push OS nécessite ce build.

## Widgets écran d'accueil

Quatre widgets, un par rôle, entièrement natifs (invisibles en Expo Go,
comme les push) :

- **Mon activité Vtout** (acheteur) — un seul widget « intelligent » qui
  affiche toujours la chose la plus utile dans l'instant, par ordre de
  priorité : commande active en cours → panier non finalisé (rappel) →
  aucune commande depuis 3 jours (relance douce) → rien d'urgent. Tap sur
  une commande active = ouvre directement cette commande dans l'app (deep
  link `vtout://order/:id`, voir § Deep linking plus bas).
- **Commandes vendeur** — nombre de commandes en attente à traiter.
- **Mes livraisons** — nombre de livraisons actives assignées.
- **À valider** (admin) — vendeurs + produits en attente de validation.

Les trois derniers n'affichent rien si le rôle correspondant n'est pas
actif sur le compte connecté.

Les données sont recalculées et poussées vers les widgets déjà présents sur
l'écran d'accueil à la connexion, à la déconnexion, et à chaque changement
de statut de commande reçu en direct (voir `NotificationContext.js` →
`src/services/widgetService.js`). Côté Android, chaque widget se met aussi
à jour tout seul même app fermée (`src/widgets/widget-task-handler.js`,
toutes les 30 min).

### Deep linking

Première configuration de deep linking de l'app (`App.js` → `linking`),
schéma `vtout://`, pour l'instant limitée à `order/:id` → écran
`OrderDetail` (utilisé par le widget acheteur). Réutilisable pour d'autres
liens profonds si besoin plus tard (parrainage, etc.).

### Android (`react-native-android-widget`)

Rien de plus à configurer — le plugin (`app.json`) génère tout au
prebuild. Fonctionne dès le prochain `eas build`.

### iOS (`@bacons/apple-targets`) — en pause, pas prioritaire

Lancement Android uniquement pour le moment (voir § Plateformes ciblées) :
cette section reste documentée pour reprendre le chantier iOS plus tard,
mais n'est pas un prérequis au lancement actuel. Deux prérequis avant que ça
compile en EAS Build :

1. **`ios.appleTeamId`** dans `app.json` — actuellement absent (log
   d'avertissement à chaque `expo export`/`prebuild`, "iOS builds may fail
   until this is corrected"). Se trouve dans Xcode (Signing & Capabilities)
   ou sur developer.apple.com/account sous "Membership".
2. Le widget lit ses données via un **App Group** partagé
   (`group.com.vtout.mobile`, déjà déclaré dans `ios.entitlements`) — rien
   à faire de plus, EAS Build gère la signature de ce groupe
   automatiquement à partir du Team ID ci-dessus.

Le code natif du widget vit dans `targets/widget/` (Swift/WidgetKit), en
dehors du dossier `ios/` généré — il survit donc à un `expo prebuild
--clean`. Voir `targets/widget/widgets.swift`.

## Prochaines étapes suggérées

1. Icônes/splash de production (`assets/`) — ceux fournis sont des
   placeholders Expo par défaut.
2. Espace admin : si besoin d'aller plus loin, prioriser le CMS
   (FAQ/blog/politiques) ou les paramètres système en second temps —
   volontairement laissés au site web pour l'instant.
3. Lancement Android : `extra.googleAndroidClientId` (Google Sign-In) +
   `eas.json`/`extra.eas.projectId` (généré par `eas init`, jamais poussé
   ici jusqu'à présent) — les deux seules valeurs encore manquantes avant
   un build de production Android.
4. iOS : repris plus tard, hors périmètre du lancement actuel (voir § iOS
   dans la section Widgets).
