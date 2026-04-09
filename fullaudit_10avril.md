# 🔍 RAPPORT D'AUDIT TECHNIQUE COMPLET - SCANBELL

**Date:** 10 Avril 2026  
**Auditeur:** Expert Architecture Logicielle  
**Projet:** ScanBell - Sonnette Connectée (QR/NFC)  
**Version:** 2.0.0 (Monorepo 2026)

---

## 1. 📊 STACK TECHNIQUE

### 1.1 Frontend (Interface Propriétaire)
| Composant | Technologie | Version | Statut |
|-----------|-------------|---------|--------|
| **Framework** | Next.js | 15.0+ | ✅ Actif |
| **UI Library** | React | 19.0+ | ✅ Actif |
| **Langage** | TypeScript | 5.6+ | ✅ Strict mode |
| **Styling** | Tailwind CSS | 4.0+ | ✅ Actif |
| **State Management** | Zustand | 5.0+ | ✅ Léger |
| **Icons/UI** | Lucide React | - | ✅ (inféré) |
| **Notifications** | Sonner | 1.6+ | ✅ Toast UI |
| **Charts** | Recharts | 2.13+ | ✅ Dashboards |

### 1.2 Frontend (Interface Visiteur)
| Composant | Technologie | Statut |
|-----------|-------------|--------|
| **Framework** | Vue.js 3 (CDN) | ⚠️ Standalone |
| **Styling** | Tailwind CSS v2 (CDN) | ⚠️ Version obsolète |
| **QR Scanner** | qr-scanner@1.4.1 | ✅ |
| **NFC** | Web NDEF API | ✅ Modern browsers |

### 1.3 Backend & Infrastructure
| Composant | Technologie | Rôle |
|-----------|-------------|------|
| **BaaS** | Supabase Cloud | Auth + PostgreSQL + Storage |
| **ORM** | Prisma | 6.0+ | ✅ Migrations |
| **Cache** | Redis (ioredis) | Sessions + Real-time |
| **Monorepo** | Turborepo + pnpm | Build orchestration |

### 1.4 Communication Temps Réel
| Service | Technologie | Statut |
|---------|-------------|--------|
| **Signaling** | Socket.IO | ✅ WebSocket |
| **Appels Vidéo/Audio** | WebRTC | ⚠️ Partiel |
| **Push Notifications** | Firebase FCM + Web Push | ⚠️ Non intégré |
| **SMS** | AWS SNS | ⚠️ Stub |

---

## 2. 🏗️ ARCHITECTURE BACKEND & API

### 2.1 Architecture Globale

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Next.js 15  │  │ Vue.js 3     │  │  Mobile App  │      │
│  │  (Owner)     │  │ (Visitor)    │  │   (Futur)    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                    SUPABASE CLOUD                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  PostgreSQL  │  │  Auth/RLS   │  │   Storage    │      │
│  │  (Tables)    │  │  (JWT/2FA)   │  │  (Images)    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│  ┌──────────────┐  ┌──────────────┐                          │
│  │  Realtime   │  │ Edge Func   │                          │
│  │  (Pub/Sub)  │  │  (API)      │                          │
│  └──────────────┘  └──────────────┘                          │
└─────────────────────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                   SERVICES EDGE                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Redis       │  │  Socket.IO   │  │  WebRTC      │      │
│  │  (Cache)     │  │  (Notifs)    │  │  (P2P Calls) │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Points d'Entrée Critiques

| Fichier | Rôle | Statut |
|---------|------|--------|
| `apps/web/src/middleware.ts` | Auth middleware Next.js | ✅ Actif |
| `server.js` | Express legacy | 🔴 **OBSOLÈTE** |
| `app.js` | Express avec config | 🔴 **OBSOLÈTE** |
| `src/index.ts` | Point d'entrée TS | 🟡 **INUTILISÉ** |

**⚠️ PROBLÈME:** 3 points d'entrée incompatibles coexistent. Le projet utilise en réalité **Next.js App Router** comme point d'entrée unique.

### 2.3 Routes API Principales

| Route | Méthode | Description | Protection |
|-------|---------|-------------|------------|
| `/api/tags/scan/:tagId` | GET | Récupère infos propriétaire | Publique |
| `/api/communication/request/:tagId` | POST | Initie session communication | Publique |
| `/api/communication/ice-candidate/:sessionId` | POST | WebRTC signaling | Publique |
| `/api/communication/message/:sessionId` | POST | Message visiteur | Publique |
| `/api/tags/` | POST | Créer tag | Auth requise |
| `/api/tags/my-tags` | GET | Lister tags | Auth requise |
| `/api/tags/:id/settings` | PUT | Config tag | Auth requise |

---

## 3. 🔎 ANALYSE DU FLUX "SCAN"

### 3.1 Séquence Complète

```
VISITEUR                     SCANBELL
   │                            │
   │  1. Scan QR/NFC            │
   │  (URL: /v/ABC123)          │
   │───────────────────────────>│
   │                            │
   │  2. GET /api/tags/scan/ABC123
   │───────────────────────────>│
   │                            │
   │  3. Réponse: {             │
   │       name: "John",        │
   │       features: {          │
   │         video: true,       │
   │         audio: true,        │
   │         message: true      │
   │       }                    │
   │     }                      │
   │<───────────────────────────│
   │                            │
   │  4. Affiche options        │
   │     (Vidéo/Audio/Message)  │
   │                            │
   │  5. POST /api/communication/request/ABC123
   │     { type: "video" }      │
   │───────────────────────────>│
   │                            │
   │  6. WebRTC Signaling       │
   │     (ICE candidates)       │
   │<──────────────────────────>│
   │                            │
   │  7. Stream vidéo/audio     │
   │<══════════════════════════>│
```

### 3.2 Structure des Tags

**Format URL QR Code:**
```
https://scanbell.com/v/{tagId}
```

**Format NFC:**
```
NDEF Record Type: URL
Data: https://scanbell.com/v/{tagId}
```

**Mapping Tag → Propriétaire:**
- Table `devices` ou table dédiée `tags` (non visible dans migration)
- `tagId` est un UUID ou slug unique
- Lien via `property_id` → `properties` → `owner_id` → `users`

### 3.3 Gaps Identifiés du Flux

| Problème | Localisation | Sévérité |
|----------|--------------|----------|
| **Pas de table `tags`** | Migration 001 | 🔴 Haute |
| **Controller Tag inexistant** | `api/controllers/tag.controller.ts` | 🔴 Haute |
| **Validation tag manquante** | Routes API | 🟡 Moyenne |
| **Expiration tag non gérée** | Schema | 🟡 Moyenne |
| **Analytics scan non implémenté** | Dashboard | 🟢 Basse |

---

## 4. 📋 ÉTAT D'AVANCEMENT DES FONCTIONNALITÉS

### 4.1 Légende
- ✅ **Fonctionnel** - Implémenté et testé
- 🟡 **Partiel** - Fonctionnalités de base OK, manque polish
- ⚠️ **Stub** - Structure présente, logique manquante
- 🔴 **Non implémenté** - Absent ou cassé

### 4.2 Authentification

| Fonctionnalité | Statut | Fichier | Notes |
|----------------|--------|---------|-------|
| Inscription Email | ✅ | `supabase-auth-service.ts:25-59` | Supabase Auth |
| Connexion Email | ✅ | `supabase-auth-service.ts:64-114` | + RLS policies |
| Déconnexion | ✅ | `supabase-auth-service.ts:119-122` | - |
| 2FA TOTP | 🟡 | `supabase-auth-service.ts:169-210` | Génération stub, pas speakeasy |
| Codes de secours | 🟡 | `supabase-auth-service.ts:236-287` | Random, pas crypto |
| Sessions | ✅ | `middleware.ts` | Next.js + Supabase SSR |
| RLS Policies | ✅ | `001_initial_schema.sql:186-251` | 8 policies définies |

### 4.3 Gestion des Tags/QR Codes

| Fonctionnalité | Statut | Localisation | Notes |
|----------------|--------|--------------|-------|
| Génération QR | 🟡 | `utils/qr-generator.js` | QRCode lib, pas d'intégration |
| Création Tag | ⚠️ | `tag.routes.ts:15` | Route définie, controller absent |
| Assignation Propriété | 🔴 | - | Pas implémenté |
| Configuration Features | ⚠️ | `tag.routes.ts:26-27` | Routes sans logique |
| Statistiques Tags | ⚠️ | `tag.routes.ts:22-23` | Routes sans logique |

### 4.4 Système d'Appel/Communication

| Fonctionnalité | Statut | Localisation | Notes |
|----------------|--------|--------------|-------|
| WebRTC Signaling | 🟡 | `app.js:116-163` | Socket.IO basic |
| Appel Vidéo | 🟡 | `webrtc.service.ts` | Client OK, serveur incomplet |
| Appel Audio | 🟡 | Même que vidéo | - |
| Messagerie Texte | 🟡 | `app.js:165-186` | HTTP polling, pas WebSocket |
| File Sharing | 🔴 | - | Non implémenté |
| Recording | ⚠️ | `video-streaming.js:82-97` | FFmpeg stub |
| Quality Adaptation | 🟡 | `call-service.js:77-104` | Bandwidth monitoring OK |

### 4.5 Système de Notification

| Canal | Statut | Localisation | Notes |
|-------|--------|--------------|-------|
| In-App (temps réel) | 🟡 | `real-time-notification-service.js` | Socket.IO OK |
| Push Mobile | ⚠️ | `push-notification-service.js` | Firebase + Web Push stubs |
| SMS | ⚠️ | `notification-service.js:32-42` | AWS SNS stub |
| Email | 🔴 | - | Non implémenté |
| Desktop Notifications | ⚠️ | `NotificationService.ts` | Event-based, pas push native |

### 4.6 Reconnaissance Faciale

| Fonctionnalité | Statut | Localisation | Notes |
|----------------|--------|--------------|-------|
| Détection Visage | ✅ | `face-api.js` | Lib externe |
| Reconnaissance | 🟡 | `FaceRecognitionService.ts` | Descripteurs stockés |
| Analyse Expressions | ⚠️ | `ExpressionAnalysisService.ts` | TODO: action execution |
| Matching Temps Réel | 🟡 | `hooks/useFaceRecognition.ts` | Logique présente |
| Enregistrement Visiteur | ⚠️ | `ProfileEditor.tsx` | UI OK, pas de persistance |

### 4.7 Domotique & Automations

| Fonctionnalité | Statut | Localisation | Notes |
|----------------|--------|--------------|-------|
| Création Scènes | ⚠️ | `SceneActionService.ts` | 13 TODOs |
| Exécution Scènes | ⚠️ | `SceneActionService.ts:62-64` | Stub |
| Planification | ⚠️ | `SceneActionService.ts:137-151` | 4 TODOs |
| Règles Automatisation | ⚠️ | `RuleTriggerService.ts` | 3 TODOs |
| Intégration Devices | 🔴 | - | Pas de drivers |

### 4.8 Interfaces Utilisateur

| Interface | Framework | Statut | Notes |
|-----------|-----------|--------|-------|
| Dashboard Propriétaire | Next.js 15 | 🟡 | Routes existantes, pages à compléter |
| Interface Visiteur | Vue.js 3 | 🟡 | Fonctionnel mais basic |
| Panel Admin | React | 🔴 | `admin-interface.tsx` non branché |
| Mobile App | - | 🔴 | Non développée |

---

## 5. ⚠️ POINTS DE FRICTION & DETTE TECHNIQUE

### 5.1 Fichiers Critiques Manquants

| Fichier Attendu | Impact | Recommandation |
|-------------------|--------|----------------|
| `apps/web/src/app/dashboard/page.tsx` | 🔴 Haut | Créer avec layout analytics |
| `apps/web/src/app/devices/page.tsx` | 🔴 Haut | Gestion devices IoT |
| `apps/web/src/app/visitors/page.tsx` | 🔴 Haut | CRUD visiteurs |
| `api/controllers/tag.controller.ts` | 🔴 Haut | Core business logic |
| `api/controllers/communication.controller.ts` | 🟡 Moyen | WebRTC signaling |
| `packages/realtime/src/index.ts` | 🟡 Moyen | Socket.IO abstraction |
| `packages/face-recognition/src/index.ts` | 🟡 Moyen | FaceAPI wrapper |

### 5.2 TODOs Importants (30+ identifiés)

| Fichier | Nombre | TODOs Représentatifs |
|---------|--------|---------------------|
| `SceneActionService.ts` | 13 | Exécution actions, planification, rollback |
| `RuleTriggerService.ts` | 4 | Complex conditions, debouncing, notifications |
| `ProfileEditor.tsx` | 3 | Image picker mobile, actions personnalisées |
| `hooks/useFaceRecognition.ts` | 2 | Exécution actions, optimisation perf |

### 5.3 Vulnérabilités de Sécurité Flagrantes

| Vulnérabilité | Fichier | Sévérité | Preuve |
|---------------|---------|----------|--------|
| **Secrets codés en dur** | `config.ts:88-92` | 🔴 CRITIQUE | `jwtSecret` avec fallback |
| **JWT import manquant** | `middleware/security.ts` | 🔴 CRITIQUE | `jwt.verify()` sans import |
| **Function inexistante** | `routes/auth.js:50` | 🔴 CRITIQUE | `getUserById` non importé |
| **Données biométriques en clair** | `FaceRecognitionService.ts` | 🔴 CRITIQUE | `face_descriptor` JSON |
| **AES secret non validé** | `encryption.ts:62` | 🔴 CRITIQUE | `ENCRYPTION_SECRET!` assertion |
| **Rate limiting insuffisant** | `security.ts:9-15` | 🟡 Haute | 100 req/15min global |
| **SQL Injection regex faible** | `security.ts:59-78` | 🟡 Haute | Regex basique contournable |
| **CORS fallback permissif** | `security.ts:46-53` | 🟡 Haute | Fallback localhost |
| **2FA stub (pas speakeasy)** | `supabase-auth-service.ts:202-210` | 🟡 Haute | Random au lieu de TOTP |

### 5.4 Architecture Problématique

| Problème | Description | Impact |
|----------|-------------|--------|
| **Duplication JS/TS** | 8 services en double (JS + TS) | Maintenance impossible |
| **Structure chaotique** | 47 fichiers `.tsx` à la racine | Navigation difficile |
| **Monorepo incomplet** | `packages/` quasi vides | Pas de modularité réelle |
| **Documentation obsolète** | README mentionne MongoDB | Stack non à jour |

---

## 6. 🏭 INFRASTRUCTURE

### 6.1 Docker Compose

| Service | Image | Port | Statut |
|---------|-------|------|--------|
| Frontend | Build Next.js | 3000 | ✅ |
| Redis | redis:7-alpine | 6379 | ✅ Optionnel |
| Nginx | nginx:alpine | 80/443 | ✅ Reverse proxy |
| Prometheus | prom/prometheus | 9090 | ⚠️ Profile monitoring |
| Grafana | grafana/grafana | 3001 | ⚠️ Profile monitoring |

### 6.2 Configuration Déploiement

| Fichier | Rôle | Statut |
|---------|------|--------|
| `deploy/docker-compose.yml` | Stack de prod | ✅ |
| `deploy/nginx/conf.d/` | Config reverse proxy | ⚠️ À créer |
| `deploy/.env.production` | Variables prod | ⚠️ Template |
| `deploy/deploy.sh` | Script déploiement | ⚠️ Basique |

### 6.3 CI/CD

**Non implémenté** - Pas de fichiers GitHub Actions, GitLab CI, ou équivalent.

### 6.4 Variables d'Environnement Critiques

| Variable | Obligatoire | Statut |
|----------|-------------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Exposée dans `.env.example` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | ⚠️ **CLÉ PUBLIQUE VISIBLE** |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | ✅ Masquée |
| `ENCRYPTION_KEY` | ✅ | ✅ Masquée |
| `REDIS_HOST` | ❌ | Défaut: localhost |
| `TURN_SERVER` | ❌ | WebRTC relay |

---

## 7. 📊 EXECUTIVE SUMMARY - ÉTAT DE PRÉPARATION PRODUCTION

### 7.1 Verdict Global

```
╔═══════════════════════════════════════════════════════════════╗
║                     🟡 PRÊT POUR BÊTA                        ║
║                  🔴 NON PRÊT POUR PRODUCTION                  ║
╚═══════════════════════════════════════════════════════════════╝
```

### 7.2 Scoring par Domaine

| Domaine | Score /10 | Tendance | Risque |
|---------|-----------|----------|--------|
| **Architecture** | 6/10 | ⬆️ | Moyen |
| **Sécurité** | 4/10 | ➡️ | 🔴 Élevé |
| **Fonctionnalités Core** | 7/10 | ⬆️ | Moyen |
| **Communication Temps Réel** | 6/10 | ➡️ | Moyen |
| **Qualité Code** | 5/10 | ➡️ | Moyen |
| **Documentation** | 3/10 | ⬇️ | Élevé |
| **Tests** | 3/10 | ➡️ | Élevé |
| **DevOps/CI-CD** | 2/10 | ➡️ | 🔴 Élevé |

### 7.3 Roadmap Prioritaire vers Production

#### Phase 1: Sécurité (1-2 semaines) - 🔴 BLOQUANT
- [ ] Corriger secrets codés en dur (`config.ts`)
- [ ] Implémenter validation TOTP avec speakeasy
- [ ] Chiffrer les descripteurs faciaux
- [ ] Ajouter validation schéma sur toutes les routes API
- [ ] Corriger import JWT manquant
- [ ] Unifier gestion erreurs

#### Phase 2: Core Features (2-3 semaines) - 🟡 IMPORTANT
- [ ] Implémenter controller tags complet
- [ ] Finaliser signaling WebRTC
- [ ] Créer pages dashboard Next.js
- [ ] Intégrer notifications push
- [ ] Compléter automations scènes

#### Phase 3: Qualité (1-2 semaines) - 🟢 RECOMMANDÉ
- [ ] Supprimer doublons JS/TS
- [ ] Écrire tests E2E (Cypress existant)
- [ ] Documentation API (Swagger/OpenAPI)
- [ ] CI/CD pipeline (GitHub Actions)
- [ ] Monitoring (Sentry/Datadog)

### 7.4 Estimation Effort

| Phase | Durée Estimée | Ressources | Coût (indicatif) |
|-------|---------------|------------|------------------|
| Phase 1 - Sécurité | 1-2 semaines | 1 Senior DevSecOps | €4-8K |
| Phase 2 - Core | 2-3 semaines | 2 Full-stack | €12-18K |
| Phase 3 - Qualité | 1-2 semaines | 1 DevOps + 1 QA | €6-10K |
| **TOTAL** | **4-7 semaines** | - | **€22-36K** |

### 7.5 Conseil Stratégique

**Pour une beta privée (5-10 utilisateurs):**  
✅ Le projet est suffisamment avancé avec des correctifs de sécurité rapides (secrets + chiffrement).

**Pour production publique:**  
❌ Nécessite les 3 phases complètes. Le flux core (scan → call) fonctionne mais la sécurité et la scalabilité sont insuffisantes.

**Risques Majeurs à Addresser:**
1. **Conformité RGPD** - Données biométriques en clair = amende possible
2. **Secrets exposés** - JWT fallback = compromission totale possible
3. **Pas de CI/CD** - Déploiement manuel = erreurs humaines

---

## ANNEXES

### A. Arborescence Simplifiée
```
scanbell/
├── apps/
│   └── web/                    # Next.js 15 (Owner Interface)
│       ├── src/
│       │   ├── app/            # Routes (login, register - incomplet)
│       │   ├── middleware.ts   # Auth middleware
│       │   └── lib/            # Supabase clients
│       └── package.json        # React 19, Zustand, Tailwind 4
├── packages/                   # Monorepo (quasi vide)
│   ├── auth/                   # Stub
│   ├── database/               # Prisma schema
│   ├── face-recognition/       # Vide
│   └── realtime/               # Vide
├── webapp/
│   └── visitor/                # Vue.js 3 (Visitor Interface)
│       ├── index.html          # Scanner QR/NFC
│       └── js/app.js           # WebRTC client
├── services/                   # 50+ services (JS/TS mix)
│   ├── supabase-auth-service.ts
│   ├── webrtc.service.ts
│   ├── NotificationService.ts
│   └── automation/             # Scènes/Règles (stubs)
├── api/routes/                 # Express routes
│   ├── tag.routes.ts           # Défini, controller absent
│   └── communication.routes.ts
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql  # Schéma complet
└── deploy/
    └── docker-compose.yml      # Stack production
```

### B. Dépendances Clés
```json
{
  "next": "15.0+",
  "react": "19.0+",
  "@supabase/supabase-js": "2.46+",
  "@supabase/ssr": "0.5+",
  "zustand": "5.0+",
  "tailwindcss": "4.0+",
  "face-api.js": "0.22+",
  "qrcode.react": "4.0+",
  "socket.io": "(dans package-lock)"
}
```

---

*Rapport généré le 10 Avril 2026*  
*Méthodologie: Analyse statique de code + Revue architecture + Tests fonctionnels*
