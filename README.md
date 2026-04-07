<p align="center">
  <img src="./assets/readme-cover.png" alt="Gym App — illustration de couverture" width="920" />
</p>

<h1 align="center">Gym App — Front React</h1>

<p align="center">
  Client web pour piloter une salle de sport : adhérents, abonnements, caisse, boutique, contrôle d’accès et supervision multi-salles pour l’administrateur plateforme.
</p>

<div align="center">

[![React](https://img.shields.io/badge/React-19-149ECA?style=for-the-badge&logo=react&logoColor=white)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)

<br/>

[![React Router](https://img.shields.io/badge/React_Router-7-CA4245?style=for-the-badge&logo=reactrouter&logoColor=white)](https://reactrouter.com/)
[![Axios](https://img.shields.io/badge/Axios-HTTP-5A29E4?style=for-the-badge&logo=axios&logoColor=white)](https://axios-http.com/)

<br/>

[![Node.js](https://img.shields.io/badge/Node.js-LTS-339933?style=flat-square&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Dev](https://img.shields.io/badge/dev-localhost%3A3001-64748b?style=flat-square)](http://localhost:3001)

</div>

---

Ce dépôt contient **le frontend uniquement**. Il se connecte à une **API REST** (Express, JWT, schéma compatible « Gym Central ») hébergée dans un **autre projet** : clonez-la, configurez-la et lancez-la avant de développer ici.

---

## Sommaire

1. [Vue d’ensemble](#vue-densemble)
2. [Architecture d’exécution](#architecture-dexécution)
3. [Prérequis](#prérequis)
4. [Backend (autre dépôt)](#backend-autre-depot)
5. [Installation & lancement](#installation--lancement)
6. [Proxy API](#proxy-api)
7. [Build production](#build-production)
8. [Stack & structure du code](#stack--structure-du-code)
9. [Fonctionnalités par rôle](#fonctionnalités-par-rôle)
10. [Variables d’environnement](#variables-denvironnement)
11. [Dépannage](#dépannage)

---

## Vue d’ensemble

L’application propose une **authentification par rôle**, un **tableau de bord** avec indicateurs et graphiques, la gestion des **membres** et des **abonnements**, la **vente** (tickets, caisse, boutique), le **contrôle d’entrée** avec lecture de codes, et un espace **super-administrateur** (`/super/*`) pour la gestion des salles clientes et des abonnements SaaS côté opérateur.

Le service worker et le manifeste permettent une **installation** sur l’appareil et un usage proche d’une application native lorsque le navigateur le permet.

Illustration du tableau de bord (fichier vectoriel) : `assets/dashboard-hero.svg`.

---

## Architecture d’exécution

En **développement**, Vite sert l’app sur le **port 3001** et **proxifie** les requêtes `/api/*` vers le backend (par défaut `http://localhost:5000`).

```
Navigateur  →  http://localhost:3001  →  Vite
                    │
                    │  fetch /api/...
                    ▼
              Proxy  →  http://localhost:5000/api/...  →  API Express
```

Sans backend joignable, la connexion et les données métier échouent (erreurs réseau, listes vides).

---

## Prérequis

- **Node.js** LTS  
- **npm**  
- **Backend** opérationnel (voir ci-dessous)

---

## Backend (autre dépôt)

Dans un répertoire séparé :

```bash
git clone <URL-du-depot-backend> gym-back
cd gym-back
npm install
cp .env.example .env
```

Éditez `.env` (secrets, base de données, etc.) selon la documentation du backend.

```bash
npm run db:push
npm run db:generate
npm run dev
```

Vérifiez que l’API répond (ex. racine, documentation Swagger si disponible sur `/api/docs`).

---

## Installation & lancement

```bash
git clone https://github.com/Moustapha-Ndoye-dev/gym-app-front-react.git
cd gym-app-front-react
npm install
npm run dev
```

L’interface est disponible sur **http://localhost:3001** (`vite.config.ts`, `server.port`).

**Ordre conseillé :** backend d’abord, puis frontend.

---

## Proxy API

Cible du proxy dans `vite.config.ts` :

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

Adaptez `target` si l’API tourne sur un autre hôte ou port.

**Production :** le build statique n’inclut pas de proxy. Prévoyez un **reverse proxy** (même domaine, `/api` vers le backend) ou une **URL de base** pour Axios via variables d’environnement au build.

---

## Build production

```bash
npm run build
npm run preview   # test local du bundle
```

Le dossier `dist/` est prêt pour hébergement statique (CDN, Nginx, etc.).

---

## Stack & structure du code

| Technologie | Rôle |
|-------------|------|
| **React 19** | Interface |
| **TypeScript** | Typage |
| **Vite 6** | Build & serveur de dev |
| **Tailwind CSS 4** | Styles |
| **React Router 7** | Routage |
| **Axios** | HTTP (JWT) |
| **html5-qrcode** / **qrcode.react** | Lecture & affichage de codes |
| **Recharts** | Graphiques |
| **Motion** | Animations |
| **vite-plugin-pwa** | Manifeste & mise en cache |

```
src/
├── api/            # Client Axios
├── components/     # Layout, prompts (ex. PWA)
├── context/        # Auth, notifications, confirmations
├── pages/          # Écrans par route
├── lib/            # Utilitaires, messages d’erreur API
└── App.tsx         # Routes et garde par rôle
```

---

## Fonctionnalités par rôle

| Rôle | Accès principal |
|------|-----------------|
| **admin** | Tableau de bord, activités, boutique, abonnements, adhérents, tickets, contrôle d’accès, caisse, utilisateurs |
| **cashier** | Parcours vente / caisse / membres / tickets / boutique selon les routes |
| **controller** | Contrôle d’accès (scan, historique) |
| **member** | Sous-ensemble défini dans les routes |
| **superadmin** | `/super/*` : salles, abonnements SaaS, administrateurs système |

Le détail des chemins est dans `App.tsx` et `Layout.tsx`.

---

## Variables d’environnement

Fichier `.env` local (non versionné) : clés optionnelles, par ex. **Google Gemini** (`GEMINI_API_KEY`) si des fonctionnalités associées sont activées — voir `vite.config.ts` (`loadEnv`, `define`).

Ne commitez jamais de secrets.

---

## Dépannage

| Symptôme | Piste |
|----------|--------|
| Login ou chargements bloqués | Backend démarré ? Proxy pointant vers la bonne URL ? |
| 401 après un moment | Session JWT expirée : se reconnecter |
| CORS en prod | Unifier origine et `/api` (reverse proxy ou config API) |
| Port 3001 occupé | Modifier `server.port` dans `vite.config.ts` |

---

## Auteur

**Moustapha Ndoye** — ingénieur fullstack, sécurité applicative et produits SaaS.
