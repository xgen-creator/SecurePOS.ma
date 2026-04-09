# 🔧 FIXES PRIORITAIRES - ScanBell Audit

Ce document contient les corrections immédiates à apporter aux vulnérabilités CRITIQUES.

---

## 🚨 FIX #1: Secrets JWT Codés en Dur

### Problème
Fichiers concernés:
- `config.ts:88`
- `services/auth-service.ts:24`

### Correction pour config.ts
```typescript
// AVANT (DANGEREUX)
security: {
  jwtSecret: process.env.JWT_SECRET || 'your-secret-key',
  tokenExpiration: '24h',
  bcryptSaltRounds: 10
}

// APRÈS (SÉCURISÉ)
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required. Application cannot start without a secure JWT secret.');
}

export const config = {
  // ... autres configs
  security: {
    jwtSecret: JWT_SECRET,
    tokenExpiration: '24h',
    bcryptSaltRounds: 10
  }
};
```

### Correction pour auth-service.ts
```typescript
// AVANT (DANGEREUX)
class AuthService {
  private readonly JWT_SECRET: string = process.env.JWT_SECRET || 'default-secret-key';
  // ...
}

// APRÈS (SÉCURISÉ)
class AuthService {
  private readonly JWT_SECRET: string;
  
  constructor() {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET environment variable is required');
    }
    this.JWT_SECRET = secret;
  }
}
```

---

## 🚨 FIX #2: Import JWT Manquant

### Fichier: `middleware/security.ts`

### Correction
```typescript
// AJOUTER EN HAUT DU FICHIER (ligne 1)
import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import hpp from 'hpp';
import cors from 'cors';
import { createHash } from 'crypto';
```

---

## 🚨 FIX #3: Fonction Importée Inexistante

### Fichier: `routes/auth.js`

### Correction
```javascript
// AVANT (LIGNE 50 - ERREUR)
const user = await getUserById(userId);

// CORRECTION - Ajouter l'import en haut du fichier (après ligne 2)
const { getUserById } = require('../services/user-service');

// OU si user-service.js exporte différemment:
const userService = require('../services/user-service');
// Puis utiliser: userService.getUserById(userId)
```

---

## 🚨 FIX #4: Fichier Database Corrompu

### Fichier: `database/connection.ts`

### Correction - Supprimer le contenu corrompu au début
```typescript
// SUPPRIMER TOUT LE CONTENU AVANT "import mongoose"
// (lignes 1 à 55 qui contiennent ScanBellStructure, interfaces, etc.)

// LE FICHIER DOIT COMMENCER ÀINSI:
import mongoose from 'mongoose';
import { config } from '../config';

export class DatabaseConnection {
  private static instance: DatabaseConnection;
  private isConnected: boolean = false;

  private constructor() {}

  public static getInstance(): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new DatabaseConnection();
    }
    return DatabaseConnection.instance;
  }

  // ... reste du fichier inchangé
}
```

**Note:** Le contenu supprimé (interfaces Tag, TagSettings, etc.) doit être déplacé dans un fichier `types.ts` ou `interfaces.ts` séparé.

---

## 🚨 FIX #5: Assertion Non-Null sur ENCRYPTION_SECRET

### Fichier: `services/encryption.ts`

### Correction
```typescript
// AVANT (LIGNE 59-66)
private static async deriveKey(salt: Buffer): Promise<Buffer> {
  const scryptAsync = promisify(scrypt);
  return scryptAsync(
    process.env.ENCRYPTION_SECRET!,
    salt,
    this.KEY_LENGTH
  ) as Promise<Buffer>;
}

// APRÈS (SÉCURISÉ)
private static async deriveKey(salt: Buffer): Promise<Buffer> {
  const secret = process.env.ENCRYPTION_SECRET;
  if (!secret) {
    throw new Error('ENCRYPTION_SECRET environment variable is required for encryption operations');
  }
  
  const scryptAsync = promisify(scrypt);
  return scryptAsync(
    secret,
    salt,
    this.KEY_LENGTH
  ) as Promise<Buffer>;
}
```

---

## 🚨 FIX #6: Configuration TypeScript Invalide

### Fichier: `tsconfig.json`

### Correction
```json
// AVANT (LIGNE 27)
"include": ["./sources/**/*.ts"]

// APRÈS
"include": ["./src/**/*.ts", "./services/**/*.ts", "./middleware/**/*.ts", "./routes/**/*.ts"]
```

**Alternative** - Si vous voulez inclure tous les fichiers TS:
```json
{
  "compilerOptions": {
    // ... options existantes
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"]
    }
  },
  "exclude": ["node_modules", "dist", "client"],
  "include": ["**/*.ts"]
}
```

---

## 🚨 FIX #7: Credentials AWS

### Fichier: `config.ts`

### Correction
```typescript
// AVANT
export const config = {
  aws: {
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
    },
    // ...
  }
};

// APRÈS (SÉCURISÉ)
const getAwsConfig = () => {
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  
  if (!accessKeyId || !secretAccessKey) {
    console.warn('AWS credentials not configured. AWS features will be disabled.');
    return null;
  }
  
  return {
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: { accessKeyId, secretAccessKey },
    s3: {
      bucketName: process.env.AWS_S3_BUCKET || 'scanbell-storage',
      visitorImagesPrefix: 'visitors/',
      tempImagesPrefix: 'temp/'
    },
    // ...
  };
};

export const config = {
  aws: getAwsConfig(),
  // ... autres configs
};
```

---

## 📋 .env.example à Créer

Créer un fichier `.env.example` à la racine:

```bash
# ============================================
# SCANBELL - CONFIGURATION ENVIRONNEMENT
# ============================================

# OBLIGATOIRE - Sécurité
JWT_SECRET=votre_secret_jwt_tres_long_et_aleatoire_64_caracteres_min
ENCRYPTION_SECRET=votre_cle_chiffrement_32_caracteres

# OBLIGATOIRE - Base de données
MONGODB_URI=mongodb://localhost:27017/scanbell
REDIS_URL=redis://localhost:6379

# OPTIONNEL - AWS (si utilisation S3/Rekognition)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=votre_access_key
AWS_SECRET_ACCESS_KEY=votre_secret_key
AWS_S3_BUCKET=scanbell-storage

# OPTIONNEL - 2FA / Notifications
TWILIO_ACCOUNT_SID=votre_account_sid
TWILIO_AUTH_TOKEN=votre_auth_token
TWILIO_PHONE_NUMBER=+1234567890

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=votre_email@gmail.com
SMTP_PASS=votre_mot_de_passe_app

# OPTIONNEL - WebRTC
TURN_USERNAME=turn_user
TURN_PASSWORD=turn_password

# Configuration serveur
PORT=3000
NODE_ENV=production
ALLOWED_ORIGINS=https://votredomaine.com,https://admin.votredomaine.com
```

---

## ⚡ Script de Vérification

Créer `scripts/verify-env.js`:

```javascript
#!/usr/bin/env node

const requiredEnvVars = [
  'JWT_SECRET',
  'ENCRYPTION_SECRET',
  'MONGODB_URI'
];

const missing = requiredEnvVars.filter(varName => !process.env[varName]);

if (missing.length > 0) {
  console.error('❌ ERREUR: Variables d\'environnement manquantes:');
  missing.forEach(v => console.error(`   - ${v}`));
  process.exit(1);
}

// Vérification force du JWT_SECRET
if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
  console.error('❌ ERREUR: JWT_SECRET doit faire au moins 32 caractères');
  process.exit(1);
}

console.log('✅ Toutes les variables d\'environnement requises sont présentes');
process.exit(0);
```

**Ajouter au package.json:**
```json
{
  "scripts": {
    "prestart": "node scripts/verify-env.js",
    "start": "ts-node src/index.ts"
  }
}
```

---

## ✅ Checklist de Déploiement Sécurisé

Avant tout déploiement:

- [ ] JWT_SECRET généré (64+ caractères aléatoires)
- [ ] ENCRYPTION_SECRET généré (32+ caractères)
- [ ] MongoDB sécurisé (auth activé, IP whitelist)
- [ ] Redis sécurisé (auth, pas d'exposition publique)
- [ ] HTTPS obligatoire (pas de HTTP en production)
- [ ] Headers sécurisés activés (Helmet)
- [ ] Rate limiting configuré
- [ ] Logs d'audit activés
- [ ] Backup automatique configuré
- [ ] Monitoring/Alerting en place

---

**⚠️ NE PAS DÉPLOYER EN PRODUCTION AVANT D'AVOIR APPLIQUÉ TOUS CES FIXES ⚠️**
