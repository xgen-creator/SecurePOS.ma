# Guide de Configuration des Appareils Scanbell

## 📋 Prérequis

### Réseau
- Wi-Fi 2.4GHz ou 5GHz
- Bande passante minimale : 10Mbps
- Routeur compatible UPnP
- DHCP activé

### Alimentation
- Prises électriques à proximité
- Onduleur recommandé
- Câblage conforme aux normes

### Smartphone
- iOS 13+ ou Android 8+
- Bluetooth 4.0+
- Application Scanbell installée

## 🎥 Caméras de Sécurité

### Spécifications Recommandées
- Résolution : 1080p minimum
- Vision nocturne : 10m minimum
- Angle de vue : 120° minimum
- Stockage : Compatible NVR/Cloud
- Audio bidirectionnel

### Installation Physique
1. Choix de l'emplacement
   - Hauteur : 2.1m - 2.4m
   - Angle : 30-45 degrés
   - Éviter : 
     - Lumière directe
     - Sources de chaleur
     - Obstacles

2. Montage
   - Utilisez le gabarit fourni
   - Percez les trous marqués
   - Installez les chevilles
   - Fixez le support
   - Ajustez l'angle

### Configuration Réseau
1. Première connexion
   ```bash
   # Scan réseau pour trouver la caméra
   nmap -sn 192.168.1.0/24
   
   # Vérification ports ouverts
   nmap -p- [IP_CAMERA]
   ```

2. Paramètres réseau
   - IP statique recommandée
   - Ports à ouvrir : 8000-8999
   - QoS : Priorité haute

3. Sécurité
   - Changez le mot de passe par défaut
   - Activez le HTTPS
   - Désactivez les services inutiles
   - Mettez à jour le firmware

## 🔒 Serrures Connectées

### Compatibilité
- Portes : 35-45mm d'épaisseur
- Type de serrure : Européenne
- Cylindre : Compatible Smart Lock

### Installation
1. Préparation
   - Retirez l'ancienne serrure
   - Nettoyez la zone
   - Vérifiez les dimensions

2. Montage
   - Installez le cylindre
   - Fixez le module principal
   - Installez les batteries
   - Testez manuellement

3. Configuration
   ```json
   {
     "device": {
       "type": "smartlock",
       "protocol": "zigbee",
       "autoLock": true,
       "lockTimeout": 30,
       "notifications": {
         "lockStatus": true,
         "batteryLow": true
       }
     }
   }
   ```

## 🚨 Système d'Alarme

### Composants
1. Centrale
   - Alimentation secourue
   - Module GSM
   - Batterie 24h

2. Détecteurs
   - Mouvement : 1 par pièce
   - Ouverture : Portes/fenêtres
   - Fumée : Points stratégiques

### Installation
1. Centrale
   - Local technique
   - Proximité routeur
   - Accès maintenance

2. Détecteurs
   - Hauteur : 2.2m
   - Couverture : 90°
   - Zone morte : 1.5m

### Configuration
```yaml
alarm_system:
  zones:
    - name: "Entrée"
      type: "delay"
      delay: 30
      sensors: ["PIR_01", "CONTACT_01"]
    
    - name: "Séjour"
      type: "instant"
      sensors: ["PIR_02", "CONTACT_02"]

  modes:
    - name: "Total"
      active_zones: ["*"]
    
    - name: "Nuit"
      active_zones: ["Entrée", "Séjour"]
```

## 📡 Hub Domotique

### Installation
1. Emplacement
   - Centre du logement
   - Proximité routeur
   - Éviter les obstacles

2. Connexions
   - Ethernet recommandé
   - Alimentation secourue
   - Ports USB libres

### Configuration Réseau
```bash
# Configuration réseau
network:
  ssid: "Scanbell_Hub"
  security: "WPA2"
  channel: "auto"
  power: "high"

# Protocoles supportés
protocols:
  - zigbee:
      channel: 15
      power: 20
  - zwave:
      region: "EU"
  - wifi:
      mode: "ap+client"
```

### Intégration
1. Appairage dispositifs
   ```javascript
   // Exemple d'appairage
   async function pairDevice() {
     const hub = await ScanBell.getHub();
     await hub.startPairing(60); // 60 secondes
     
     hub.on('deviceFound', (device) => {
       console.log('Nouveau dispositif:', device.id);
       device.pair();
     });
   }
   ```

2. Configuration zones
   ```json
   {
     "zones": [
       {
         "id": "living_room",
         "name": "Séjour",
         "devices": ["camera_01", "motion_01", "lock_01"]
       },
       {
         "id": "entrance",
         "name": "Entrée",
         "devices": ["camera_02", "lock_02"]
       }
     ]
   }
   ```

## 🔧 Maintenance

### Routine Quotidienne
- Vérification état batteries
- Test communication
- Contrôle vidéo

### Maintenance Mensuelle
- Nettoyage capteurs
- Test sirène
- Mise à jour firmware

### Maintenance Annuelle
- Remplacement batteries
- Vérification connexions
- Test complet système

## 🚨 Dépannage

### Diagnostic
```bash
# Vérification connectivité
ping [DEVICE_IP]

# Test ports
telnet [DEVICE_IP] [PORT]

# Logs système
tail -f /var/log/scanbell/device.log
```

### Problèmes Courants
1. Perte connexion
   - Vérifiez alimentation
   - Testez réseau
   - Redémarrez appareil

2. Fausses alertes
   - Ajustez sensibilité
   - Nettoyez capteurs
   - Vérifiez zones

3. Batterie faible
   - Remplacez batteries
   - Vérifiez consommation
   - Testez alimentation

## 📞 Support

### Contact
- Support technique : support@scanbell.com
- Urgence : +XX XXX XXX XXX
- Chat en ligne : chat.scanbell.com

### Documentation
- Wiki : wiki.scanbell.com
- Forum : forum.scanbell.com
- FAQ : faq.scanbell.com
