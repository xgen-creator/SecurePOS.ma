# ScanBell API Documentation

## 🔑 Authentication

### POST /api/auth/login
Authentification utilisateur.
```json
{
  "email": "string",
  "password": "string"
}
```

### POST /api/auth/register
Création d'un nouveau compte.
```json
{
  "email": "string",
  "password": "string",
  "name": "string"
}
```

## 👤 Users

### GET /api/users
Liste des utilisateurs.

### GET /api/users/:id
Détails d'un utilisateur.

### PUT /api/users/:id
Mise à jour d'un utilisateur.

## 📹 Cameras

### GET /api/cameras
Liste des caméras.

### POST /api/cameras
Ajouter une nouvelle caméra.
```json
{
  "name": "string",
  "url": "string",
  "location": "string"
}
```

### GET /api/cameras/:id/stream
Stream vidéo d'une caméra.

## 👥 Visitors

### GET /api/visitors
Liste des visiteurs.

### POST /api/visitors
Ajouter un nouveau visiteur.
```json
{
  "name": "string",
  "photo": "base64",
  "access": "enum(ALWAYS, SCHEDULED, ONCE)"
}
```

## 🔔 Notifications

### GET /api/notifications
Liste des notifications.

### POST /api/notifications/settings
Configuration des notifications.
```json
{
  "pushEnabled": "boolean",
  "emailEnabled": "boolean",
  "events": ["VISITOR", "ALERT", "SYSTEM"]
}
```

## 📊 Analytics

### GET /api/analytics/visitors
Statistiques des visiteurs.

### GET /api/analytics/events
Journal des événements.

## 🔒 Access Control

### GET /api/access/logs
Journaux d'accès.

### POST /api/access/rules
Création de règles d'accès.
```json
{
  "userId": "string",
  "schedule": {
    "days": ["MONDAY", "TUESDAY"],
    "startTime": "HH:mm",
    "endTime": "HH:mm"
  }
}
```

## 💾 Backup

### POST /api/system/backup
Création d'une sauvegarde.

### GET /api/system/backups
Liste des sauvegardes.

### POST /api/system/restore
Restauration depuis une sauvegarde.

## 🏠 Home Automation

### GET /api/automation/devices
Liste des appareils connectés.

### POST /api/automation/rules
Création de règles d'automatisation.
```json
{
  "trigger": "VISITOR_RECOGNIZED",
  "action": "UNLOCK_DOOR",
  "conditions": []
}
```

## Codes d'Erreur
- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 500: Internal Server Error

## Authentification
Toutes les requêtes (sauf /auth/login et /auth/register) doivent inclure un header Bearer token :
```
Authorization: Bearer <token>
```

## Rate Limiting
- 100 requêtes par minute pour les endpoints publics
- 1000 requêtes par minute pour les endpoints authentifiés

## Versioning
L'API est versionnée via le chemin URL : `/api/v1/...`
