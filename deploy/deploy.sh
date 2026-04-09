#!/bin/bash

# Scanbell Deployment Script
set -e

# Configuration
APP_NAME="scanbell"
DEPLOY_ENV=${1:-production}
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="./backups"

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Logger function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}"
    exit 1
}

warn() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    command -v docker >/dev/null 2>&1 || error "Docker is required but not installed"
    command -v docker-compose >/dev/null 2>&1 || error "Docker Compose is required but not installed"
    command -v git >/dev/null 2>&1 || error "Git is required but not installed"
}

# Create backup
create_backup() {
    log "Creating backup..."
    
    mkdir -p "$BACKUP_DIR"
    
    # Backup MongoDB
    log "Backing up MongoDB..."
    docker-compose exec -T mongodb mongodump --archive > "$BACKUP_DIR/mongodb_$TIMESTAMP.archive"
    
    # Backup Redis
    log "Backing up Redis..."
    docker-compose exec -T redis redis-cli SAVE
    docker cp "$(docker-compose ps -q redis):/data/dump.rdb" "$BACKUP_DIR/redis_$TIMESTAMP.rdb"
}

# Load environment variables
load_env() {
    log "Loading environment variables for $DEPLOY_ENV environment..."
    
    if [ ! -f ".env.$DEPLOY_ENV" ]; then
        error ".env.$DEPLOY_ENV file not found"
    fi
    
    set -a
    source ".env.$DEPLOY_ENV"
    set +a
}

# Pull latest changes
pull_changes() {
    log "Pulling latest changes..."
    
    git fetch --all
    git checkout "$DEPLOY_ENV"
    git pull origin "$DEPLOY_ENV"
}

# Build and deploy
deploy() {
    log "Starting deployment process..."
    
    # Build images
    log "Building Docker images..."
    docker-compose build --no-cache
    
    # Stop existing containers
    log "Stopping existing containers..."
    docker-compose down
    
    # Start new containers
    log "Starting new containers..."
    docker-compose up -d
    
    # Wait for services to be healthy
    log "Waiting for services to be healthy..."
    sleep 30
    
    # Verify deployment
    verify_deployment
}

# Verify deployment
verify_deployment() {
    log "Verifying deployment..."
    
    # Check if all containers are running
    if [ "$(docker-compose ps --services --filter "status=running" | wc -l)" -ne "$(docker-compose ps --services | wc -l)" ]; then
        error "Not all containers are running"
    }
    
    # Check API health
    if ! curl -s "http://localhost:4000/health" | grep -q "ok"; then
        error "API health check failed"
    }
    
    # Check frontend
    if ! curl -s "http://localhost:3000" > /dev/null; then
        error "Frontend check failed"
    }
    
    log "Deployment verified successfully!"
}

# Cleanup
cleanup() {
    log "Cleaning up..."
    
    # Remove unused images
    docker image prune -f
    
    # Remove old backups (keep last 5)
    cd "$BACKUP_DIR" && ls -t | tail -n +6 | xargs -r rm --
}

# Rollback function
rollback() {
    warn "Deployment failed! Rolling back..."
    
    # Restore from backup
    log "Restoring from backup..."
    docker-compose down
    
    # Restore MongoDB
    docker-compose up -d mongodb
    sleep 10
    docker-compose exec -T mongodb mongorestore --archive < "$BACKUP_DIR/mongodb_$TIMESTAMP.archive"
    
    # Restore Redis
    docker cp "$BACKUP_DIR/redis_$TIMESTAMP.rdb" "$(docker-compose ps -q redis):/data/dump.rdb"
    docker-compose restart redis
    
    error "Rollback completed. Please check the logs for more information."
}

# Main deployment process
main() {
    log "Starting deployment for $APP_NAME in $DEPLOY_ENV environment"
    
    check_prerequisites
    load_env
    create_backup
    pull_changes
    
    if ! deploy; then
        rollback
    fi
    
    cleanup
    log "Deployment completed successfully!"
}

# Run main function
main "$@"
