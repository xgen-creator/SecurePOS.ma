# ScanBell 2026 - Guide de Démarrage

Ce guide vous permet de démarrer rapidement avec le projet ScanBell après la migration vers Supabase Cloud.

---

## Prérequis

- **Node.js** >= 20.0.0
- **pnpm** >= 9.0.0
- **Compte Supabase** (gratuit sur [supabase.com](https://supabase.com))

---

## Installation Rapide (5 minutes)

### 1. Cloner et Installer

```bash
# À la racine du projet
pnpm install

cd apps/web
pnpm install
```

### 2. Configurer les Variables d'Environnement

Copier le fichier exemple :
```bash
cp apps/web/.env.local.example apps/web/.env.local
```

Éditer `apps/web/.env.local` avec vos secrets :

```env
# Supabase (depuis votre projet Supabase Dashboard)
NEXT_PUBLIC_SUPABASE_URL=https://votre-projet.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=votre-cle-anon
SUPABASE_SERVICE_ROLE_KEY=votre-cle-service

# Sécurité (générer des clés fortes)
JWT_SECRET=$(openssl rand -base64 32)
ENCRYPTION_KEY=$(openssl rand -base64 32)
```

### 3. Configurer Supabase Cloud

1. Créer un projet sur [Supabase Dashboard](https://app.supabase.com)
2. Exécuter le schéma SQL : `supabase/migrations/001_initial_schema.sql`
3. Copier les clés API dans `.env.local`

### 4. Démarrer le Serveur de Développement

```bash
cd apps/web
pnpm dev
```

L'application est accessible sur `http://localhost:3000`

---

## Structure du Projet Post-Migration

```
scanbell-monorepo/
├── apps/
│   └── web/                      # Next.js 15 + Supabase SSR
│       ├── src/
│       │   ├── lib/supabase/    # Clients Supabase (client/server/middleware)
│       │   ├── middleware.ts    # Protection routes
│       │   └── app/             # App Router Next.js
│       └── .env.local
├── packages/
│   ├── auth/                    # Auth utilisant Supabase
│   └── database/                # Prisma + Types Supabase
├── services/
│   ├── supabase-auth-service.ts # Service auth principal
│   ├── DoorBellService.ts       # Logique sonnette
│   └── ...
├── types/
│   └── models.ts                # Types TypeScript centraux
├── supabase/
│   └── migrations/              # Schéma SQL
└── deploy/
    └── docker-compose.yml       # Docker minimal
```

---

## Commandes Utiles

### Développement

```bash
# Démarrer le frontend
cd apps/web && pnpm dev

# Build production
pnpm build

# Linter
cd apps/web && pnpm lint
```

### Supabase

```bash
# Démarrer Supabase local (optionnel)
supabase start

# Pousser les migrations
supabase db push

# Générer les types TypeScript
supabase gen types typescript --project-id nrmfqjrwewyvvnkxwxww > packages/database/src/supabase-types.ts
```

### Docker (Production)

```bash
cd deploy
docker-compose up -d
```

---

## Vérification de l'Installation

### 1. Tests de Connexion

```bash
# Vérifier que Supabase est accessible
curl -I https://votre-projet.supabase.co/rest/v1/
```

### 2. Test Auth

1. Accéder à `http://localhost:3000/login`
2. Créer un compte
3. Vérifier que l'utilisateur apparaît dans Supabase Dashboard (Table `users`)

### 3. Test RLS (Multi-tenant)

```sql
-- Dans Supabase SQL Editor
SELECT * FROM properties;
-- Devrait retourner vide si RLS fonctionne (pas de owner_id correspondant)
```

---

## Dépannage

### Erreur: `Cannot find module '@supabase/ssr'`

```bash
cd apps/web
pnpm install
```

### Erreur: `JWT_SECRET environment variable is required`

Ajouter dans `apps/web/.env.local`:
```env
JWT_SECRET=votre-secret-minimum-32-caracteres
```

### Erreur: `Failed to connect to database`

Vérifier que `NEXT_PUBLIC_SUPABASE_URL` est correct et que le projet Supabase est actif.

---

## Architecture

### Authentification

```
Utilisateur → Next.js App Router → Supabase Auth → PostgreSQL
                    ↓
              Middleware SSR
                    ↓
              Row Level Security
```

### Multi-tenant (RLS)

Chaque utilisateur ne voit que ses données:
- `properties` filtré par `owner_id`
- `devices` filtré via `property_id`
- `visitors` filtré via `property_id`

### Flux Scan Bell

```
Visiteur scan QR/NFC → WebApp Visitor → WebRTC P2P → Propriétaire
                                           ↓
                                    Supabase Realtime
```

---

## Documentation Supplémentaire

- [RAPPORT_MIGRATION_SUPABASE.md](./RAPPORT_MIGRATION_SUPABASE.md) - Détails de la migration
- [supabase/config.toml](./supabase/config.toml) - Configuration Supabase locale
- [docs/API.md](./docs/API.md) - Documentation API

---

## Support

En cas de problème:
1. Vérifier les logs: `apps/web/.next/logs`
2. Consulter [Supabase Status](https://status.supabase.com)
3. Ouvrir une issue sur le repository

---

**Projet prêt pour production sur Supabase Cloud!** 🚀
