# Guide de Backup Scanbell

## 📦 Contenu du Backup

Le backup complet inclut :

1. **Code Source**
   - Tout le code du projet
   - Fichiers de configuration
   - Documentation

2. **Base de Données**
   - Dump MongoDB complet
   - Données Redis
   - Indexes et métadonnées

3. **Configurations**
   - Variables d'environnement
   - Configuration Docker
   - Configuration Nginx
   - Certificats SSL

4. **Logs**
   - Logs applicatifs
   - Logs Docker
   - Logs système

5. **Médias**
   - Images uploadées
   - Vidéos
   - Documents

6. **Métadonnées**
   - Date du backup
   - Version du projet
   - Informations système
   - Versions des dépendances

## 🚀 Utilisation

### Créer un Backup

```bash
# Rendre le script exécutable
chmod +x backup.sh

# Lancer le backup
./backup.sh
```

### Restaurer un Backup

1. Décompresser l'archive :
```bash
tar -xzf scanbell_backup_YYYYMMDD_HHMMSS.tar.gz
```

2. Restaurer la base de données :
```bash
# MongoDB
mongorestore --archive=mongodb_dump.archive

# Redis
docker cp redis_dump.rdb redis:/data/dump.rdb
docker-compose restart redis
```

3. Restaurer les fichiers :
```bash
# Code source
tar -xzf source_code.tar.gz -C /chemin/vers/projet

# Configurations
cp -r nginx_conf/* /etc/nginx/
cp .env.production /chemin/vers/projet/

# Médias
cp -r media/* /chemin/vers/projet/uploads/
```

## 📅 Planning de Backup

- **Backup quotidien** : 2h00 du matin
- **Backup hebdomadaire** : Dimanche 3h00
- **Backup mensuel** : 1er du mois 4h00

## 🔒 Sécurité

- Chiffrement AES-256
- Stockage sécurisé
- Accès restreint
- Vérification d'intégrité

## 📊 Monitoring

- Notifications de statut
- Logs de backup
- Alertes d'erreur
- Rapport mensuel

## 🔄 Rétention

- Quotidien : 7 jours
- Hebdomadaire : 4 semaines
- Mensuel : 12 mois

## 🚨 Dépannage

### Erreurs Communes

1. **Espace disque insuffisant**
   - Vérifier l'espace disponible
   - Nettoyer les anciens backups
   - Augmenter l'espace disque

2. **Timeout Base de Données**
   - Augmenter le délai d'attente
   - Vérifier la charge serveur
   - Optimiser les indexes

3. **Erreur de Permissions**
   - Vérifier les droits utilisateur
   - Ajuster les permissions
   - Utiliser sudo si nécessaire

### Contact Support

- Email : support@scanbell.com
- Tél : +XX XXX XXX XXX
- Chat : support.scanbell.com
