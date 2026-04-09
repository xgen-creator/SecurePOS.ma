# Rapport d'Audit Technique - ScanBell

**Date:** 9 Avril 2026  
**Projet:** ScanBell - Sonnette Connectée avec Reconnaissance Faciale  
**Version:** 2.0.0

---

## 1. Stack Technique

### Architecture Globale
- **Monorepo:** TurboRepo (v2.3.0) + pnpm workspaces
- **Package Manager:** pnpm@9.0.0
- **Runtime:** Node.js >=20.0.0
- **TypeScript:** v5.6.0

### Frontend
| Technologie | Version | Usage |
|-------------|---------|-------|
| **Next.js** | 15.0.0 (App Router) | Application principale (`apps/web`) |
| **React** | 19.0.0 | UI Framework |
| **TailwindCSS** | 4.0.0 | Styling |
| **Zustand** | 5.0.0 | State Management |
| **Supabase SSR** | 0.5.0 | Auth côté serveur |

### Frontend Legacy
- **React 18.2.0** avec Create React App (`client/`)
- **Redux Toolkit** pour la gestion d'état
- **Material UI (MUI)** v5.14.3
- **Socket.IO Client** pour WebSocket

### Backend & Base de Données
| Service | Technologie | Statut |
|---------|-------------|--------|
| **BaaS Principal** | Supabase (PostgreSQL + Auth) | ✅ Configuré |
| **ORM** | Prisma v6.0.0 | ✅ Actif |
| **Cache** | Redis (ioredis) | ⚠️ Config legacy |
| **Realtime** | Supabase Realtime | ✅ Actif |

### Bibliothèques Clés
- **face-api.js** v0.22.2 - Reconnaissance faciale côté client
- **react-webcam** v7.2.0 - Accès caméra
- **qrcode.react** v4.0.0 - Génération QR codes
- **recharts** v2.13.0 - Visualisations
- **sonner** v1.6.0 - Notifications toast

---

## 2. Architecture Backend & API

### Modèle d'Architecture
Le projet présente une **architecture hybride en transition** avec deux stacks coexistants:

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                          │
├─────────────────────────────────────────────────────────────┤
│  Next.js 15 (apps/web)    │    React 18 SPA (client/)       │
│  - App Router              │    - Redux + MUI               │
│  - Supabase SSR Auth       │    - Socket.IO                 │
└─────────────────────────────────────────────────────────────┘
                            │
┌─────────────────────────────────────────────────────────────┐
│                    BACKEND LAYER                             │
├─────────────────────────────────────────────────────────────┤
│  Supabase (BaaS)          │    Express Legacy (routes/)      │
│  - PostgreSQL              │    - JWT custom                │
│  - Row Level Security      │    - MongoDB refs              │
│  - Edge Functions          │    - WebSocket custom          │
└─────────────────────────────────────────────────────────────┘
```

### Communication Temps Réel
| Technologie | Usage | Statut |
|-------------|-------|--------|
| **WebRTC** | Appels vidéo/audio P2P | ✅ Implémenté (`services/webrtc.service.ts`) |
| **WebSocket** | Notifications temps réel | ⚠️ Double implémentation (ws + Socket.IO) |
| **Supabase Realtime** | Changements DB temps réel | ✅ Configuré |

### Services Backend (`/services`)
- **DoorBellService.ts** - Logique principale sonnette
- **NotificationService.ts** - Notifications multi-canal (WebSocket, Email, Push)
- **FaceRecognitionService.ts** - Reconnaissance faciale avec face-api.js
- **ExpressionAnalysisService.ts** - Analyse des expressions faciales
- **SceneAutomationService.ts** - Scènes domotiques
- **webrtc.service.ts** - Gestion WebRTC
- **auth-service.ts** - Authentification JWT + 2FA

---

## 3. Analyse du Flux "Scan"

### Flux Principal

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   SCAN QR    │ ──▶ │  EXTRACT ID  │ ──▶ │  FETCH OWNER │ ──▶ │   WEB APP    │
│   / NFC Tag  │     │  from URL    │     │   from DB    │     │   INTERFACE  │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
                                                                      │
                                                                      ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  PROPRIÉTAIRE│ ◀── │  NOTIFICATION│ ◀── │  WEBRTC P2P  │ ◀── │ VISITEUR     │
│   ALERTÉ     │     │  (Push/WS)   │     │  CALL/MSG    │     │  CHOICE      │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
```

### Implémentation du Flux

**Fichier:** `@/webapp/visitor/index.html:27-46`

```html
<!-- Étape 1: Scanner -->
<div v-if="currentStep === 'scan'">
    <div id="scanner-container"></div>
    <button @click="startScanner">Scanner QR Code</button>
    <button @click="checkNFC">Utiliser NFC</button>
</div>

<!-- Étape 2: Options de contact -->
<div v-if="currentStep === 'contact'">
    <h1>{{ ownerInfo.name }}</h1>
    <button @click="initiateCommunication('video')">Appel Vidéo</button>
    <button @click="initiateCommunication('audio')">Appel Audio</button>
    <button @click="initiateCommunication('message')">Message</button>
</div>
```

### Identification du Tag
L'identification se fait via:
1. **Paramètres URL** - Ex: `/visitor?id={tag_id}&property={property_id}`
2. **QR Code** - Encodé avec l'ID du device/propriétaire
3. **NFC Tag** - Écriture NDEF avec URL pointant vers la webapp

### Lien Propriétaire
- La table `devices` contient `property_id` (FK vers `properties`)
- La table `properties` contient `owner_id` (FK vers `users`)
- RLS (Row Level Security) garantit l'isolation des données

---

## 4. État d'Avancement des Fonctionnalités

### 4.1 Authentification

| Fonctionnalité | Statut | Localisation |
|----------------|--------|--------------|
| Login/Register | ✅ **Terminé** | `routes/auth.ts:9-34` |
| JWT Auth | ✅ **Terminé** | `middleware/auth.ts:21-65` |
| 2FA (TOTP/SMS) | ✅ **Terminé** | `routes/auth.ts:37-91`, `services/two-factor-auth.ts` |
| Codes de secours | ✅ **Terminé** | `routes/auth.ts:94-113` |
| Supabase Auth | ✅ **Terminé** | `supabase/config.toml:33-52` |
| Session Management | ✅ **Terminé** | `services/session-service.js` |

### 4.2 Gestion des Tags/QR Codes

| Fonctionnalité | Statut | Commentaire |
|----------------|--------|-------------|
| Génération QR | ✅ **Terminé** | `qrcode.react` utilisé |
| Assignation propriétaire | ✅ **Terminé** | Schéma `properties` ↔ `devices` |
| Tableau de bord admin | ⚠️ **Partiel** | `admin-interface.tsx` existant |
| Analytics scans | ⚠️ **Partiel** | `analytics-module.tsx` basique |

### 4.3 Système de Notification/Call

| Fonctionnalité | Statut | Localisation |
|----------------|--------|--------------|
| WebRTC P2P | ✅ **Terminé** | `services/webrtc.service.ts` |
| WebSocket temps réel | ✅ **Terminé** | `services/notification-service.ts:26-27` |
| Push Notifications | ⚠️ **Stub** | Implémentation Firebase/OneSignal manquante (`notification-service.ts:127-138`) |
| Email Notifications | ✅ **Terminé** | Nodemailer configuré |
| Appel vidéo | ✅ **Terminé** | Interface dans `video-call-interface.tsx` |
| Appel audio | ✅ **Terminé** | Supporté via WebRTC |
| Messagerie instantanée | ✅ **Terminé** | Canal de données WebRTC (`webrtc.service.ts:34-52`) |

### 4.4 Interfaces

| Interface | Statut | Technologie |
|-----------|--------|-------------|
| **Interface Visiteur** | ✅ **Terminé** | Vue.js (CDN) - `webapp/visitor/` |
| **Interface Propriétaire** | ✅ **Terminé** | Next.js 15 - `apps/web/` |
| **Interface Admin** | ⚠️ **Partiel** | Composants React dispersés |
| **Mobile Responsive** | ⚠️ **Partiel** | Tailwind présent mais pas uniforme |

### 4.5 Fonctionnalités Avancées

| Fonctionnalité | Statut | Commentaire |
|----------------|--------|-------------|
| Reconnaissance faciale | ✅ **Terminé** | face-api.js avec SSD MobileNet |
| Analyse expressions | ✅ **Terminé** | `ExpressionAnalysisService.ts` |
| Détection âge/genre | ✅ **Terminé** | `FaceRecognitionService.ts:130-150` |
| Domotique/Scènes | ⚠️ **Partiel** | `automation-rules.tsx`, `SceneAutomationService.ts` |
| Gestion livraisons | ✅ **Terminé** | `delivery-management.tsx` |
| Historique visites | ✅ **Terminé** | `visit-history.tsx` |
| Analytics sécurité | ⚠️ **Partiel** | `security-dashboard.tsx` basique |

---

## 5. Points de Friction & Dette Technique

### 5.1 Incohérences Architecturales Majeures

#### 🔴 **CRITIQUE: Dualité Base de Données**
```
Supabase (PostgreSQL) <-- Stack moderne
        ↑
   MongoDB (legacy)  <-- Docker Compose, README
```
- **README.md:18** mentionne MongoDB v6.0+
- **supabase/** contient migrations PostgreSQL complètes
- **docker-compose.yml:44-53** configure MongoDB
- **Action:** Décider et migrer complètement vers Supabase

#### 🔴 **CRITIQUE: Dualité Authentification**
- JWT custom (`middleware/auth.ts`) + Supabase Auth (`supabase/config.toml:34`)
- Deux systèmes de session coexistent
- **Risque:** Conflits de tokens, sécurité réduite

#### 🔴 **CRITIQUE: Fichiers Models Manquants**
Les services référencent des models non existants:
- `@/models/FaceModel` → `DoorBellService.ts:2` (import inexistant)
- `@/models/notification.model` → `notification-service.ts:4`
- `@/models/user.model` → `notification-service.ts:5`

### 5.2 TODOs Importants

**Fichier:** `services/SceneActionService.ts` (13 TODOs)
```typescript
// TODO: Implement scene action execution
// TODO: Add error handling for device communication
// TODO: Implement rollback on failure
```

**Fichier:** `services/automation/RuleTriggerService.ts`
```typescript
// TODO: Add support for complex conditions
// TODO: Implement debouncing for rapid triggers
```

**Fichier:** `hooks/useFaceRecognition.ts`
```typescript
// TODO: Optimize face detection performance
```

### 5.3 Vulnérabilités de Sécurité

| Vulnérabilité | Gravité | Localisation |
|---------------|---------|--------------|
| **JWT Secret hardcodé** | 🔴 Haute | `config.ts:88` - fallback "your-secret-key" |
| **Clés AWS en clair** | 🔴 Haute | `config.ts:39-42` - utilisent process.env sans validation |
| **CORS non configuré** | 🟡 Moyenne | Non visible dans les configs Next.js/Express |
| **Rate limiting absent** | 🟡 Moyenne | Pas de `express-rate-limit` visible |
| **Input validation partielle** | 🟡 Moyenne | `validations/` existe mais pas uniformément utilisé |

### 5.4 Dette Technique Code

#### Fichiers Vides ou Incomplets
- `home-automation.js` - 0 bytes
- `packages/face-recognition/src/` - vide
- `packages/realtime/src/` - vide
- `packages/ui/` - vide

#### Duplications
- `services/notification-service.js` + `services/notification-service.ts` (JS + TS)
- `services/logging-service.js` + `services/logging-service.ts`
- `routes/auth.js` + `routes/auth.ts`
- `middleware/auth.js` + `middleware/auth.ts`

#### Imports Non Résolus
```typescript
// DoorBellService.ts:2
import { Face } from '../models/FaceModel';  // ❌ N'existe pas

// notification-service.ts:4-7
import { Notification } from '../models/notification.model';  // ❌ N'existe pas
import { User } from '../models/user.model';  // ❌ N'existe pas
```

---

## 6. Infrastructure

### 6.1 Docker & Déploiement

**Fichier:** `@/deploy/docker-compose.yml`

| Service | Statut | Note |
|---------|--------|------|
| Frontend | ⚠️ Legacy | Pointe vers `client/` (CRA), pas `apps/web` |
| API | ⚠️ Legacy | Pointe vers `server/` - ce dossier existe? |
| MongoDB | 🔴 Inutile | Si migration Supabase complète |
| Redis | ✅ Utile | Cache sessions/notifications |
| Nginx | ✅ Configuré | Reverse proxy + SSL |
| WebSocket | ⚠️ Orphelin | Pointe vers `websocket/` - dossier inexistant |
| ML Service | ⚠️ Orphelin | Pointe vers `ml-service/` - dossier inexistant |
| Prometheus/Grafana | ✅ Monitoring | Stack observabilité |

### 6.2 Configuration CI/CD
- **Absente** - Pas de `.github/workflows/`, GitLab CI, ou équivalent
- **Absente** - Pas de scripts de déploiement automatisé

### 6.3 Configuration Environnement

**Fichier:** `@/.env.example`

| Variable | Statut |
|----------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ Configuré |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ Présent (clé exemple) |
| `SUPABASE_SERVICE_ROLE_KEY` | ⚠️ Template |
| `DATABASE_URL` | ✅ Format Supabase |
| `ENCRYPTION_KEY` | ⚠️ Template (32 chars requis) |
| Variables Twilio/SendGrid | ⚠️ Commentées - optionnelles |

### 6.4 Tests

| Type | Statut | Configuration |
|------|--------|---------------|
| Unit Tests | ⚠️ **Partiel** | Jest configuré, couverture inégale |
| E2E Tests | ⚠️ **Partiel** | Cypress présent (`cypress/e2e/`) |
| Intégration | ⚠️ **Partiel** | `__tests__/integration/` minimal |

**Fichier:** `@/jest.config.js`
```javascript
// Configuration basique - manque:
// - Coverage thresholds
// - Module path aliases
// - Setup files
```

---

## 7. Executive Summary

### État Global du Projet

| Domaine | Score | Commentaire |
|---------|-------|-------------|
| **Architecture** | 🟡 **6/10** | Transition incomplète legacy → moderne |
| **Fonctionnalités Core** | 🟢 **8/10** | Scan + Call + Auth fonctionnels |
| **Sécurité** | 🟡 **5/10** | RLS Supabase OK, mais JWT legacy vulnérable |
| **Tests** | 🟡 **4/10** | Présents mais couverture faible |
| **Documentation** | 🟢 **7/10** | Docs API, guides présents |
| **Infrastructure** | 🟡 **5/10** | Docker OK, CI/CD absent |
| **Préparation Prod** | 🟡 **4/10** | Nécessite consolidation |

### 🎯 Prêt pour Production ?

**NON** - Le projet nécessite une phase de consolidation avant mise en production.

### Actions Prioritaires (Ordre Chronologique)

#### Phase 1: Stabilisation (1-2 semaines)
1. **Résoudre la dualité BDD** - Migrer complètement vers Supabase
2. **Unifier l'authentification** - Supprimer JWT custom, utiliser Supabase Auth
3. **Créer les models manquants** ou adapter Prisma
4. **Nettoyer les fichiers dupliqués** (JS/TS)

#### Phase 2: Sécurisation (1 semaine)
5. **Retirer tous les secrets hardcodés**
6. **Implémenter rate limiting**
7. **Configurer CORS appropriément**
8. **Audit complet des dépendances** (`npm audit`)

#### Phase 3: Infrastructure (1-2 semaines)
9. **Mettre à jour Docker Compose** (pointer vers `apps/web`)
10. **Mettre en place CI/CD** (GitHub Actions)
11. **Configurer environnements** (dev/staging/prod)
12. **Améliorer la couverture de tests**

#### Phase 4: Optimisation (2 semaines)
13. **Implémenter push notifications** (FCM/OneSignal)
14. **Optimiser WebRTC** (TURN server production)
15. **Monitoring Sentry/Datadog**

### Estimation Totale
**~6-7 semaines** pour une version production-ready stable.

### Points Forts à Préserver
- ✅ Schéma Supabase bien conçu avec RLS
- ✅ Architecture monorepo moderne (Turbo)
- ✅ Reconnaissance faciale fonctionnelle
- ✅ WebRTC implémenté pour P2P
- ✅ Migration Next.js 15 initiée

### Risques Majeurs à Addresser
- 🔴 **Sécurité:** Secrets en dur, double système auth
- 🔴 **Stabilité:** Imports cassés, models manquants
- 🔴 **Ops:** Pas de CI/CD, Docker mal aligné

---

## Annexe: Fichiers Clés

| Fichier | Rôle |
|---------|------|
| `apps/web/package.json` | Dépendances Next.js 15 |
| `supabase/migrations/001_initial_schema.sql` | Schéma PostgreSQL complet |
| `supabase/config.toml` | Configuration Supabase |
| `services/DoorBellService.ts` | Logique métier sonnette |
| `services/webrtc.service.ts` | WebRTC pour appels |
| `webapp/visitor/index.html` | Interface visiteur |
| `deploy/docker-compose.yml` | Infrastructure Docker |

---

*Rapport généré le 9 Avril 2026 - Audit complet du codebase ScanBell*
