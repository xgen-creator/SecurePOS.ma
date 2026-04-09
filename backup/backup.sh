#!/bin/bash

# Configuration
BACKUP_ROOT="/backups/scanbell"
PROJECT_ROOT="c:/Users/PC_01/Desktop/All AI Project/Scanbell"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="scanbell_backup_$TIMESTAMP"

# Créer le répertoire de backup
mkdir -p "$BACKUP_ROOT/$BACKUP_NAME"

# Fonction de logging
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1"
}

# 1. Backup du code source
backup_source_code() {
    log "Sauvegarde du code source..."
    
    # Créer une archive du code source
    tar -czf "$BACKUP_ROOT/$BACKUP_NAME/source_code.tar.gz" \
        --exclude="node_modules" \
        --exclude=".git" \
        --exclude="dist" \
        --exclude="build" \
        "$PROJECT_ROOT"
}

# 2. Backup de la base de données
backup_database() {
    log "Sauvegarde de la base de données..."
    
    # MongoDB
    docker-compose exec -T mongodb mongodump --archive > "$BACKUP_ROOT/$BACKUP_NAME/mongodb_dump.archive"
    
    # Redis
    docker-compose exec -T redis redis-cli SAVE
    docker cp "$(docker-compose ps -q redis):/data/dump.rdb" "$BACKUP_ROOT/$BACKUP_NAME/redis_dump.rdb"
}

# 3. Backup des configurations
backup_configs() {
    log "Sauvegarde des configurations..."
    
    # Sauvegarder les fichiers de configuration
    cp "$PROJECT_ROOT/deploy/.env.production" "$BACKUP_ROOT/$BACKUP_NAME/"
    cp "$PROJECT_ROOT/deploy/docker-compose.yml" "$BACKUP_ROOT/$BACKUP_NAME/"
    cp -r "$PROJECT_ROOT/deploy/nginx" "$BACKUP_ROOT/$BACKUP_NAME/nginx_conf"
}

# 4. Backup des logs
backup_logs() {
    log "Sauvegarde des logs..."
    
    # Créer le répertoire des logs
    mkdir -p "$BACKUP_ROOT/$BACKUP_NAME/logs"
    
    # Copier les logs du projet
    find "$PROJECT_ROOT" -name "*.log" -exec cp {} "$BACKUP_ROOT/$BACKUP_NAME/logs/" \;
    
    # Logs Docker
    docker-compose logs > "$BACKUP_ROOT/$BACKUP_NAME/logs/docker-compose.log"
}

# 5. Backup des médias et fichiers uploadés
backup_media() {
    log "Sauvegarde des médias..."
    
    # Créer le répertoire des médias
    mkdir -p "$BACKUP_ROOT/$BACKUP_NAME/media"
    
    # Copier les fichiers média
    cp -r "$PROJECT_ROOT/uploads" "$BACKUP_ROOT/$BACKUP_NAME/media/"
    cp -r "$PROJECT_ROOT/public/media" "$BACKUP_ROOT/$BACKUP_NAME/media/"
}

# 6. Créer un fichier de métadonnées
create_metadata() {
    log "Création des métadonnées..."
    
    cat > "$BACKUP_ROOT/$BACKUP_NAME/metadata.json" << EOF
{
    "backup_date": "$(date +'%Y-%m-%d %H:%M:%S')",
    "backup_name": "$BACKUP_NAME",
    "project_version": "$(git rev-parse HEAD)",
    "docker_compose_version": "$(docker-compose version --short)",
    "node_version": "$(node --version)",
    "npm_version": "$(npm --version)",
    "system_info": {
        "os": "$(uname -a)",
        "disk_space": "$(df -h / | tail -1)"
    }
}
EOF
}

# 7. Compression du backup
compress_backup() {
    log "Compression du backup..."
    
    cd "$BACKUP_ROOT"
    tar -czf "${BACKUP_NAME}.tar.gz" "$BACKUP_NAME"
    rm -rf "$BACKUP_NAME"
}

# 8. Nettoyage des anciens backups
cleanup_old_backups() {
    log "Nettoyage des anciens backups..."
    
    # Garder seulement les 5 derniers backups
    cd "$BACKUP_ROOT"
    ls -t *.tar.gz | tail -n +6 | xargs -r rm
}

# Fonction principale
main() {
    log "Démarrage du backup complet..."
    
    backup_source_code
    backup_database
    backup_configs
    backup_logs
    backup_media
    create_metadata
    compress_backup
    cleanup_old_backups
    
    log "Backup terminé avec succès!"
    log "Backup sauvegardé dans: $BACKUP_ROOT/${BACKUP_NAME}.tar.gz"
}

# Exécution du script
main "$@"
