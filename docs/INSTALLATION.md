# Guide d'Installation ScanBell

## 📋 Prérequis Détaillés

### Système
- CPU: 4 cœurs minimum recommandés
- RAM: 8GB minimum
- Stockage: 20GB minimum
- OS: Windows 10/11, Linux (Ubuntu 20.04+), macOS (Catalina+)

### Logiciels
1. **Node.js**
   - Version: 18.x ou supérieure
   - [Téléchargement](https://nodejs.org/)
   - Vérification : `node --version`

2. **MongoDB**
   - Version: 6.0 ou supérieure
   - [Guide d'installation](https://docs.mongodb.com/manual/installation/)
   - Vérification : `mongod --version`

3. **Redis**
   - Version: 7.0 ou supérieure
   - [Guide d'installation](https://redis.io/download)
   - Vérification : `redis-cli --version`

4. **Git**
   - [Téléchargement](https://git-scm.com/)
   - Vérification : `git --version`

## 🚀 Installation Pas à Pas

### 1. Préparation de l'Environnement

```bash
# Créer le dossier du projet
mkdir scanbell
cd scanbell

# Cloner le repository
git clone https://github.com/votre-username/scanbell.git .

# Installer les dépendances globales
npm install -g typescript ts-node nodemon
```

### 2. Configuration de la Base de Données

```bash
# MongoDB
# Créer le dossier data
mkdir -p data/db

# Démarrer MongoDB
mongod --dbpath data/db

# Redis
# Démarrer Redis
redis-server
```

### 3. Configuration du Projet

```bash
# Installer les dépendances
npm install

# Copier le fichier d'environnement
cp .env.example .env
```

Éditer le fichier `.env` :
```env
# Server
PORT=3000
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/scanbell
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=votre_secret_jwt
JWT_EXPIRATION=24h

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=votre@email.com
SMTP_PASS=votre_mot_de_passe

# Face Recognition
FACE_RECOGNITION_MODEL_PATH=./models
MIN_FACE_CONFIDENCE=0.6

# Storage
STORAGE_PATH=./storage
MAX_UPLOAD_SIZE=10mb
```

### 4. Installation des Modèles de Reconnaissance Faciale

```bash
# Créer le dossier des modèles
mkdir -p models

# Télécharger les modèles
npm run download-models
```

### 5. Compilation et Démarrage

```bash
# Compiler le projet
npm run build

# Démarrer en mode développement
npm run dev

# OU Démarrer en mode production
npm start
```

## 🔍 Vérification de l'Installation

1. **Vérifier le serveur**
   - Ouvrir http://localhost:3000
   - Vous devriez voir la page d'accueil

2. **Vérifier l'API**
   - Tester l'endpoint de santé : http://localhost:3000/api/health
   - Devrait retourner `{"status": "ok"}`

3. **Vérifier la Base de Données**
   ```bash
   # MongoDB
   mongo
   use scanbell
   db.stats()

   # Redis
   redis-cli ping
   ```

## 🛠️ Configuration Avancée

### SSL/HTTPS
```bash
# Générer les certificats
openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout private.key -out certificate.pem
```

### Nginx (Optionnel)
```nginx
server {
    listen 80;
    server_name scanbell.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 🔧 Dépannage

### Problèmes Courants

1. **Erreur de connexion MongoDB**
   ```bash
   # Vérifier le service
   systemctl status mongodb
   
   # Vérifier les logs
   tail -f /var/log/mongodb/mongod.log
   ```

2. **Erreur de connexion Redis**
   ```bash
   # Vérifier le service
   systemctl status redis
   
   # Vérifier les logs
   tail -f /var/log/redis/redis-server.log
   ```

3. **Erreur de compilation TypeScript**
   ```bash
   # Nettoyer le cache
   npm run clean
   
   # Réinstaller les dépendances
   rm -rf node_modules
   npm install
   ```

## 📞 Support

En cas de problème :
1. Consulter les logs : `npm run logs`
2. Vérifier la documentation : `/docs`
3. Ouvrir une issue sur GitHub
4. Contacter le support : support@scanbell.com
