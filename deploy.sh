#!/bin/bash
# ==============================================
# BOSS Cloaker v3.2 - Plesk Deployment Script
# ==============================================
set -e

echo "🚀 BOSS Cloaker v3.2 - Deploying..."

# Renk tanımları
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# --- Adım 1: Node.js kontrolü ---
echo -e "\n${YELLOW}[1/6] Node.js kontrol ediliyor...${NC}"
NODE_VERSION=$(node -v 2>/dev/null || echo "NOT FOUND")
echo "Node.js: $NODE_VERSION"

if [[ "$NODE_VERSION" == "NOT FOUND" ]]; then
    echo -e "${RED}❌ Node.js bulunamadı! Plesk'te Node.js extension'ı yükleyin.${NC}"
    exit 1
fi

NPM_VERSION=$(npm -v 2>/dev/null || echo "NOT FOUND")
echo "npm: v$NPM_VERSION"

# --- Adım 2: Bağımlılıkları yükle ---
echo -e "\n${YELLOW}[2/6] Bağımlılıklar yükleniyor...${NC}"
npm install --production --no-optional 2>&1 | tail -5

# bcrypt native modül - build tools gerekir
if ! node -e "require('bcrypt')" 2>/dev/null; then
    echo -e "${YELLOW}⚠️  bcrypt derlenemedi, node-gyp ile tekrar deniyor...${NC}"
    npm rebuild bcrypt 2>&1 | tail -3
fi

echo -e "${GREEN}✅ Bağımlılıklar tamam${NC}"

# --- Adım 3: .env kontrolü ---
echo -e "\n${YELLOW}[3/6] Konfigürasyon kontrol ediliyor...${NC}"
if [ ! -f ".env" ]; then
    echo -e "${RED}❌ .env dosyası bulunamadı!${NC}"
    echo "  cp .env.example .env && nano .env"
    exit 1
fi

# DATABASE_URL kontrolü
if ! grep -q "DATABASE_URL=" .env; then
    echo -e "${RED}❌ DATABASE_URL .env dosyasında tanımlı değil!${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Konfigürasyon tamam${NC}"

# --- Adım 4: Build kontrolü ---
echo -e "\n${YELLOW}[4/6] Build kontrol ediliyor...${NC}"
if [ ! -f "dist/index.cjs" ]; then
    echo -e "${RED}❌ dist/index.cjs bulunamadı! Build yapılmamış.${NC}"
    echo "  npm run build"
    exit 1
fi

if [ ! -d "dist/public" ]; then
    echo -e "${RED}❌ dist/public dizini bulunamadı!${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Build dosyaları tamam${NC}"

# --- Adım 5: Gerekli dizinleri oluştur ---
echo -e "\n${YELLOW}[5/6] Dizinler hazırlanıyor...${NC}"

# public symlink
if [ ! -L "public" ] && [ ! -d "public" ]; then
    ln -sfn dist/public public
    echo "  ✓ public -> dist/public symlink oluşturuldu"
fi

# tmp dizini (Passenger restart için)
mkdir -p tmp
echo "  ✓ tmp/ dizini hazır"

# logs dizini
mkdir -p logs
echo "  ✓ logs/ dizini hazır"

echo -e "${GREEN}✅ Dizinler tamam${NC}"

# --- Adım 6: Veritabanı tabloları ---
echo -e "\n${YELLOW}[6/6] Veritabanı kontrol ediliyor...${NC}"
if node -e "
  require('dotenv').config();
  const { Pool } = require('pg');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  pool.query('SELECT 1').then(() => { console.log('DB OK'); pool.end(); }).catch(e => { console.error('DB FAIL:', e.message); pool.end(); process.exit(1); });
" 2>/dev/null; then
    echo -e "${GREEN}✅ Veritabanı bağlantısı başarılı${NC}"
else
    echo -e "${RED}❌ Veritabanına bağlanılamadı! DATABASE_URL kontrol edin.${NC}"
    exit 1
fi

# Schema push
echo "  Veritabanı tabloları güncelleniyor..."
npx drizzle-kit push 2>&1 | tail -3 || echo -e "${YELLOW}⚠️  drizzle-kit push başarısız olabilir, tablolar zaten mevcut olabilir${NC}"

# --- Sonuç ---
echo ""
echo "=============================================="
echo -e "${GREEN}🎉 BOSS Cloaker v3.2 deployment hazır!${NC}"
echo "=============================================="
echo ""
echo "Passenger'ı yeniden başlatmak için:"
echo "  touch tmp/restart.txt"
echo ""
echo "Plesk Nginx ayarları (Additional nginx directives):"
echo "  passenger_app_type node;"
echo "  passenger_startup_file app.cjs;"
echo "  passenger_nodejs $(which node);"
echo "  passenger_app_env production;"
echo "  passenger_friendly_error_pages on;"
echo "  passenger_start_timeout 90;"
echo "  passenger_sticky_sessions on;"
echo "  passenger_min_instances 1;"
echo "  client_max_body_size 10M;"
echo ""
echo "Hata logları:"
echo "  tail -f /var/log/nginx/error.log"
echo "  tail -f /var/log/passenger/*.log"
echo ""
