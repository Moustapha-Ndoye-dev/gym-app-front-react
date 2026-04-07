<p align="center">
  <img src="./assets/banner.svg" alt="Gym App — Front React" width="920" />
</p>

<h1 align="center">Gym App — Front React</h1>

<p align="center">
  Interface web pour la gestion de salle de sport · <strong>QR</strong> · <strong>PWA</strong> · API Gym Central
</p>

<p align="center">
  <a href="https://github.com/Moustapha-Ndoye-dev/gym-app-front-react">Dépôt GitHub</a>
</p>

<div align="center">

[![React](https://img.shields.io/badge/React-19-149ECA?style=for-the-badge&logo=react&logoColor=white)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)

<br/>

[![React Router](https://img.shields.io/badge/React_Router-7-CA4245?style=for-the-badge&logo=reactrouter&logoColor=white)](https://reactrouter.com/)
[![Axios](https://img.shields.io/badge/Axios-HTTP-5A29E4?style=for-the-badge&logo=axios&logoColor=white)](https://axios-http.com/)
[![PWA](https://img.shields.io/badge/PWA-ready-5A0FC8?style=for-the-badge&logo=pwa&logoColor=white)](https://web.dev/progressive-web-apps/)

<br/>

[![Node.js](https://img.shields.io/badge/Node.js-LTS-339933?style=flat-square&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Dev server](https://img.shields.io/badge/dev-localhost%3A3001-64748b?style=flat-square)](http://localhost:3001)

</div>

---

Interface **SPA** pour la gestion quotidienne d’une salle de sport : adhérents, abonnements, caisse, boutique, contrôle d’accès par **QR code**, et espace **super-administrateur** pour l’opérateur SaaS.

Ce dépôt est **uniquement le frontend**. L’**API REST** (Node / Express / Prisma) doit être **clonée depuis son propre dépôt**, configurée et lancée à part (voir section ci-dessous).

**Visuels SVG du projet :** `assets/banner.svg` (en-tête de ce README), `assets/dashboard-hero.svg` (illustration du tableau de bord dans l’application).

---

## Sommaire

1. [Architecture d’exécution](#architecture-dexécution)
2. [Prérequis](#prérequis)
3. [Backend obligatoire (autre dépôt)](#backend-obligatoire-autre-depot)
4. [Installation & lancement du frontend](#installation--lancement-du-frontend)
5. [Proxy API & personnalisation](#proxy-api--personnalisation)
6. [Build production](#build-production)
7. [Stack & organisation du code](#stack--organisation-du-code)
8. [Fonctionnalités par rôle](#fonctionnalités-par-rôle)
9. [Variables d’environnement front](#variables-denvironnement-front)
10. [Dépannage](#dépannage)

---

## Architecture d’exécution

En **développement**, le serveur Vite sert l’application sur un port dédié (**3001** par défaut) et **proxifie** toutes les requêtes dont le chemin commence par `/api` vers le backend (par défaut `http://localhost:5000`).

```
Navigateur  →  http://localhost:3001  →  Vite (dev server)
                    │
                    │  fetch /api/...
                    ▼
              Proxy Vite  →  http://localhost:5000/api/...  →  API Express
```

Ainsi, le navigateur ne parle qu’au même **origin** que la page (`localhost:3001`), ce qui évite les problèmes CORS en local. **Sans backend actif**, les appels `/api/*` échouent : connexion impossible, listes vides, erreurs réseau.

---

## Prérequis

- **Node.js** LTS
- **npm**
- **Backend** cloné, configuré et démarré (voir section suivante)

---

## Backend obligatoire (autre dépôt)

Le frontend suppose qu’une API compatible est disponible. Dans un **second répertoire** :

```bash
git clone <URL-du-depot-backend> gym-back
cd gym-back
npm install
cp .env.example .env
```

Éditez `.env` : notamment `JWT_SECRET` et les mots de passe par défaut conformément aux commentaires du fichier exemple.

```bash
npm run db:push
npm run db:generate
npm run dev
```

Contrôlez que l’API répond, par exemple :

- `http://localhost:5000/` (message de statut)
- `http://localhost:5000/api/docs` (Swagger)

**Conservez ce processus actif** pendant que vous travaillez sur le frontend.

---

## Installation & lancement du frontend

```bash
git clone https://github.com/Moustapha-Ndoye-dev/gym-app-front-react.git
cd gym-app-front-react
npm install
npm run dev
```

L’application est servie sur **http://localhost:3001** (voir `vite.config.ts`, clé `server.port`).

**Ordre recommandé :** démarrer le **backend** en premier, puis le **frontend**.

---

## Proxy API & personnalisation

La cible du proxy est définie dans `vite.config.ts` :

```ts
server: {
  port: 3001,
  proxy: {
    '/api': {
      target: 'http://localhost:5000',
      changeOrigin: true,
    },
  },
},
```

Si votre API tourne ailleurs (autre machine, autre port, tunnel), modifiez `target` puis redémarrez `npm run dev`.

> **Production :** le build statique (`npm run build`) ne contient pas de proxy. Il faut soit servir le front et l’API derrière un **reverse proxy** unique (même domaine, `/api` vers le backend), soit configurer une **URL de base** pour le client HTTP (Axios) via variables d’environnement au moment du build, selon votre hébergeur.

---

## Build production

```bash
npm run build
npm run preview   # optionnel : test du bundle en local
```

Le dossier `dist/` contient les assets à déployer sur un CDN, un bucket statique ou derrière Nginx / Caddy / IIS.

---

## Stack & organisation du code

| Technologie | Usage |
|-------------|--------|
| **React 19** | UI déclarative |
| **TypeScript** | Typage statique |
| **Vite 6** | Build & dev server |
| **Tailwind CSS 4** | Styles utilitaires |
| **React Router 7** | Routage côté client |
| **Axios** | Client HTTP (instance partagée, JWT) |
| **html5-qrcode** / **qrcode.react** | Scan & génération QR |
| **Recharts** | Graphiques dashboard |
| **Motion** | Animations |
| **vite-plugin-pwa** | Progressive Web App |

Arborescence indicative :

```
src/
├── api/            # Instance Axios
├── components/     # Layout, navigation, blocs réutilisables
├── context/        # Auth, notifications, confirmations
├── pages/          # Écrans par route
├── lib/            # Utilitaires, limites de chaînes, messages d’erreur API
└── App.tsx         # Routes, garde d’accès par rôle
```

Les routes sensibles sont protégées : redirection vers `/login` si non authentifié, et filtrage selon le **rôle** utilisateur.

---

## Fonctionnalités par rôle

| Rôle | Accès typique |
|------|----------------|
| **admin** | Toute la salle : membres, abonnements, activités, tickets, caisse, boutique, utilisateurs, contrôle d’accès |
| **cashier** | Vente, membres, tickets, caisse, boutique (selon configuration routes) |
| **controller** | Contrôle d’accès (scanner QR, historique) |
| **member** | Sous-ensemble des écrans « staff » selon la matrice de routes |
| **superadmin** | Parcours `/super/*` : salles clientes, abonnements SaaS, administrateurs plateforme |

Le détail exact des chemins est défini dans `App.tsx` et le composant `Layout`.

---

## Variables d’environnement front

Le fichier `.env` local peut contenir notamment des clés pour des intégrations optionnelles (ex. **Google Gemini** pour des fonctionnalités IA, si activées dans le projet). Consultez `vite.config.ts` (`loadEnv`, `define`) pour les noms exacts des variables attendues au build.

Les secrets ne doivent **pas** être commités.

---

## Dépannage

| Problème | Vérification |
|----------|----------------|
| Écran de login infini ou erreur réseau | Backend lancé ? URL du proxy = URL réelle de l’API ? |
| 401 après quelques minutes | JWT expiré : se reconnecter |
| CORS en production | Configurer le serveur API **ou** un reverse proxy qui unifie origine et `/api` |
| Port 3001 déjà utilisé | Changer `server.port` dans `vite.config.ts` |

---

## Auteur

**Moustapha Ndoye** — ingénieur fullstack, orientation sécurité applicative et produits SaaS.
