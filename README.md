# ScanBell - Smart Home Facial Recognition System

## 📝 Description
ScanBell est un système de reconnaissance faciale intelligent pour la maison connectée. Il combine la sécurité, la domotique et la reconnaissance faciale pour offrir une solution complète de contrôle d'accès et de gestion domestique.

## 🚀 Fonctionnalités Principales
- 👤 Reconnaissance faciale en temps réel
- 🚪 Contrôle d'accès intelligent
- 📱 Notifications push
- 📊 Tableau de bord de sécurité
- 📹 Streaming vidéo
- 🏠 Intégration domotique
- 📝 Gestion des visiteurs
- 🔄 Système de backup/restore

## 🛠️ Prérequis
- Node.js (v18 ou supérieur)
- MongoDB (v6.0 ou supérieur)
- Redis (v7.0 ou supérieur)
- TypeScript (v5.0 ou supérieur)

## ⚙️ Installation

1. **Cloner le repository**
```bash
git clone https://github.com/votre-username/scanbell.git
cd scanbell
```

2. **Installer les dépendances**
```bash
npm install
```

3. **Configuration**
- Copier le fichier `.env.example` vers `.env`
- Modifier les variables d'environnement selon votre configuration
```bash
cp .env.example .env
```

4. **Lancer le serveur de développement**
```bash
npm run dev
```

## 🔧 Scripts Disponibles
- `npm start` - Lance l'application en production
- `npm run dev` - Lance le serveur de développement
- `npm run build` - Compile le projet
- `npm test` - Lance les tests
- `npm run e2e` - Lance les tests end-to-end

## 🏗️ Architecture
Le projet suit une architecture modulaire avec les composants suivants :
- `/api` - Endpoints API REST
- `/client` - Interface utilisateur React
- `/components` - Composants React réutilisables
- `/services` - Services métier
- `/models` - Modèles de données
- `/middleware` - Middleware Express
- `/utils` - Utilitaires

## 📚 Documentation API
La documentation détaillée de l'API est disponible à l'adresse suivante :
`http://localhost:3000/api-docs` (après le démarrage du serveur)

## 🔒 Sécurité
- Authentification JWT
- Chiffrement des données sensibles
- Validation des entrées
- Protection CSRF
- Rate limiting
- Audit logging

## 🧪 Tests
- Tests unitaires avec Jest
- Tests E2E avec Cypress
- Tests d'intégration

## 📈 Monitoring
- Surveillance des performances
- Logs système
- Alertes en temps réel
- Métriques de santé

## 🤝 Contribution
1. Fork le projet
2. Créer une branche (`git checkout -b feature/AmazingFeature`)
3. Commit les changements (`git commit -m 'Add some AmazingFeature'`)
4. Push vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrir une Pull Request

## 📄 Licence
Ce projet est sous licence MIT. Voir le fichier `LICENSE` pour plus de détails.

## 📞 Support
Pour toute question ou problème :
- Ouvrir une issue sur GitHub
- Contacter l'équipe de support à support@scanbell.com

## ✨ Remerciements
- Équipe de développement
- Contributeurs
- Communauté open source
