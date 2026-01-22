#!/bin/bash

# Deployment Script for DarkzBOX

echo "🚀 Starting Deployment..."

# 1. Pull latest changes
echo "📥 Pulling latest code..."
git pull origin main

# 2. Check for .env file
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found!"
    echo "Please create a .env file with :"
    echo "DOMAIN_NAME=yourdomain.com"
    echo "NEXTAUTH_SECRET=..."
    echo "GOOGLE_CLIENT_ID=..."
    echo "GOOGLE_CLIENT_SECRET=..."
    exit 1
fi

# 3. Build and Start Containers
# 3. Build and Start Containers
echo "🐳 Building and Starting Containers..."

# WORKAROUND: Force remove old containers to avoid python docker-compose crash (KeyError: ContainerConfig)
echo "🧹 Cleaning up old containers to prevent compatibility errors..."
# Find and remove any container with 'darkzbox' in the name (case insensitive usually, but docker filters are lowercase)
docker ps -a --filter "name=darkzbox" -q | xargs -r docker rm -f
# Also try standard compose names just in case
docker rm -f darkzbox_app_1 darkzbox_postgres_1 darkzbox_redis_1 darkzbox_caddy_1 2>/dev/null || true

# Check for docker compose v2
if docker compose version >/dev/null 2>&1; then
    DOCKER_COMPOSE_CMD="docker compose"
else
    DOCKER_COMPOSE_CMD="docker-compose"
fi
echo "Using command: $DOCKER_COMPOSE_CMD"

$DOCKER_COMPOSE_CMD -f docker-compose.prod.yml up -d --build

# 4. Run Migrations
echo "🗄️ Running Database Migrations..."
# Sleep to give DB time to start if it's new
sleep 5
$DOCKER_COMPOSE_CMD -f docker-compose.prod.yml exec app npx prisma db push

echo "✅ Deployment Complete!"
echo "Your app should be live at https://$(grep DOMAIN_NAME .env | cut -d '=' -f2)"
