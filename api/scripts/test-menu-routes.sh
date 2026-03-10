#!/usr/bin/env bash
# Test de toutes les routes menu — 19 routes — données conservées en base
set -euo pipefail

# ─── Config ───────────────────────────────────────────────────
SUPABASE_URL="https://ooxsqvhgwxrufiozmwfv.supabase.co"
ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9veHNxdmhnd3hydWZpb3ptd2Z2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkzNTU3MjIsImV4cCI6MjA4NDkzMTcyMn0.esdo0gI1CWTBz3pyun95n-eeHREyH2l2pmjcTCuXGMw"
EMAIL="valentin@westermeyer.fr"
PASSWORD="password"
RESTO="c6deb522-665b-4afe-a504-dba09a7d71fc"
BASE="http://localhost:5001/api/menu"

# ─── Couleurs ─────────────────────────────────────────────────
GREEN='\033[0;32m'; RED='\033[0;31m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; RESET='\033[0m'; BOLD='\033[1m'

PASS=0; FAIL=0

# ─── Helpers ──────────────────────────────────────────────────
check() {
  local label="$1" expected="$2" actual="$3" body="$4"
  if [ "$actual" = "$expected" ]; then
    echo -e "  ${GREEN}✓${RESET} $label ${YELLOW}[$actual]${RESET}"
    PASS=$((PASS + 1))
  else
    echo -e "  ${RED}✗${RESET} $label ${RED}[got $actual, expected $expected]${RESET}"
    echo -e "    ${RED}→ $body${RESET}"
    FAIL=$((FAIL + 1))
  fi
}

section() { echo ""; echo -e "${BLUE}${BOLD}═══ $1 ═══${RESET}"; }

call() {
  local method="$1" url="$2" data="${3:-}"
  if [ -n "$data" ]; then
    curl -s -o /tmp/resp_body -w "%{http_code}" -X "$method" "$url" \
      -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d "$data"
  else
    curl -s -o /tmp/resp_body -w "%{http_code}" -X "$method" "$url" \
      -H "Authorization: Bearer $TOKEN"
  fi
}

call_public() {
  local method="$1" url="$2"
  curl -s -o /tmp/resp_body -w "%{http_code}" -X "$method" "$url"
}

body()  { cat /tmp/resp_body; }
field() { cat /tmp/resp_body | jq -r "$1" 2>/dev/null; }

# ─── Login ────────────────────────────────────────────────────
section "LOGIN"
TOKEN=$(curl -s -X POST "$SUPABASE_URL/auth/v1/token?grant_type=password" \
  -H "apikey: $ANON_KEY" -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}" | jq -r '.access_token')

if [ "$TOKEN" = "null" ] || [ -z "$TOKEN" ]; then
  echo -e "${RED}Login échoué — arrêt${RESET}"; exit 1
fi
echo -e "  ${GREEN}✓${RESET} Token obtenu"

# ─── CATEGORIES ───────────────────────────────────────────────
section "CATEGORIES"

STATUS=$(call POST "$BASE/restaurants/$RESTO/categories" \
  '{"name":"Plats chauds","subHeading":"Woks et grillades","displayOrder":4}')
check "POST   /categories" 201 "$STATUS" "$(body)"
CAT_PLATS_ID=$(field '.data.id')
echo -e "    ${GREEN}↳ id: $CAT_PLATS_ID${RESET}"

STATUS=$(call PUT "$BASE/restaurants/$RESTO/categories/$CAT_PLATS_ID" \
  '{"name":"Plats chauds","subHeading":"Woks, grillades & bols chauds","displayOrder":4}')
check "PUT    /categories/:id" 200 "$STATUS" "$(body)"

# ─── OPTION GROUPS ────────────────────────────────────────────
section "OPTION GROUPS"

STATUS=$(call GET "$BASE/restaurants/$RESTO/option-groups")
check "GET    /option-groups (lister)" 200 "$STATUS" "$(body)"
echo -e "    ${GREEN}↳ $(field '.data | length') groupe(s) en base${RESET}"

STATUS=$(call POST "$BASE/restaurants/$RESTO/option-groups" \
  '{"name":"Cuisson","hasMultiple":false,"isRequired":true,"minQuantity":1,"maxQuantity":1,"displayOrder":5,"choices":[{"name":"Saignant","priceModifier":0,"displayOrder":1},{"name":"À point","priceModifier":0,"displayOrder":2},{"name":"Bien cuit","priceModifier":0,"displayOrder":3}]}')
check "POST   /option-groups (avec choices inline)" 201 "$STATUS" "$(body)"
OG_CUISSON_ID=$(field '.data.id')
echo -e "    ${GREEN}↳ id: $OG_CUISSON_ID ($(field '.data.optionChoices | length') choix)${RESET}"

STATUS=$(call POST "$BASE/restaurants/$RESTO/option-groups" \
  '{"name":"Épices","hasMultiple":true,"isRequired":false,"minQuantity":0,"maxQuantity":3,"displayOrder":6,"choices":[{"name":"Piment","priceModifier":0,"displayOrder":1},{"name":"Poivre de Sichuan","priceModifier":0,"displayOrder":2},{"name":"Furikake","priceModifier":0,"displayOrder":3}]}')
check "POST   /option-groups (épices)" 201 "$STATUS" "$(body)"
OG_EPICES_ID=$(field '.data.id')
echo -e "    ${GREEN}↳ id: $OG_EPICES_ID ($(field '.data.optionChoices | length') choix)${RESET}"

STATUS=$(call PUT "$BASE/restaurants/$RESTO/option-groups/$OG_EPICES_ID" \
  '{"name":"Épices & condiments","maxQuantity":4}')
check "PUT    /option-groups/:id" 200 "$STATUS" "$(body)"

# ─── OPTION CHOICES ───────────────────────────────────────────
section "OPTION CHOICES"

STATUS=$(call POST "$BASE/restaurants/$RESTO/option-groups/$OG_EPICES_ID/option-choices" \
  '{"name":"Sésame grillé","priceModifier":0,"displayOrder":4}')
check "POST   /option-choices (unitaire)" 201 "$STATUS" "$(body)"
OC_SESAME_ID=$(field '.data.id')
echo -e "    ${GREEN}↳ id: $OC_SESAME_ID${RESET}"

STATUS=$(call POST "$BASE/restaurants/$RESTO/option-groups/$OG_CUISSON_ID/option-choices/bulk" \
  '[{"name":"Mi-saignant","priceModifier":0,"displayOrder":4},{"name":"Extra bien cuit","priceModifier":0,"displayOrder":5}]')
check "POST   /option-choices/bulk" 201 "$STATUS" "$(body)"
echo -e "    ${GREEN}↳ $(field '.data | length') choix total dans Cuisson${RESET}"

STATUS=$(call PUT "$BASE/restaurants/$RESTO/option-choices/$OC_SESAME_ID" \
  '{"name":"Sésame grillé bio","priceModifier":0.3}')
check "PUT    /option-choices/:id" 200 "$STATUS" "$(body)"

# ─── PRODUCTS ─────────────────────────────────────────────────
section "PRODUCTS"

STATUS=$(call POST "$BASE/restaurants/$RESTO/products" \
  "{\"name\":\"Wok de boeuf\",\"description\":\"Boeuf sauté, légumes croquants, sauce huître\",\"imageUrl\":\"https://images.unsplash.com/photo-1603360946369-dc9bb6258143\",\"price\":15.5,\"isAvailable\":true,\"displayOrder\":1,\"categorieId\":\"$CAT_PLATS_ID\"}")
check "POST   /products (Wok de boeuf)" 201 "$STATUS" "$(body)"
PROD_WOK_ID=$(field '.data.id')
echo -e "    ${GREEN}↳ id: $PROD_WOK_ID${RESET}"

STATUS=$(call POST "$BASE/restaurants/$RESTO/products" \
  "{\"name\":\"Bowl poulet teriyaki\",\"description\":\"Poulet grillé, riz, sauce teriyaki maison\",\"imageUrl\":\"https://images.unsplash.com/photo-1512058564366-18510be2db19\",\"price\":13.9,\"isAvailable\":true,\"displayOrder\":2,\"categorieId\":\"$CAT_PLATS_ID\"}")
check "POST   /products (Bowl poulet)" 201 "$STATUS" "$(body)"
PROD_POULET_ID=$(field '.data.id')
echo -e "    ${GREEN}↳ id: $PROD_POULET_ID${RESET}"

STATUS=$(call GET "$BASE/restaurants/$RESTO/products/$PROD_WOK_ID")
check "GET    /products/:id (public)" 200 "$STATUS" "$(body)"

STATUS=$(call_public GET "$BASE/restaurants/$RESTO/products?q=wok")
check "GET    /products?q=wok (recherche)" 200 "$STATUS" "$(body)"
echo -e "    ${GREEN}↳ $(field '.data | length') résultat(s)${RESET}"

STATUS=$(call_public GET "$BASE/restaurants/$RESTO/products?isAvailable=true")
check "GET    /products?isAvailable=true" 200 "$STATUS" "$(body)"

STATUS=$(call_public GET "$BASE/restaurants/$RESTO/products?isAvailable=false")
check "GET    /products?isAvailable=false" 200 "$STATUS" "$(body)"

STATUS=$(call PUT "$BASE/restaurants/$RESTO/products/$PROD_WOK_ID" \
  '{"name":"Wok de boeuf wagyu","price":17,"tags":["boeuf","wok","chaud"]}')
check "PUT    /products/:id" 200 "$STATUS" "$(body)"
echo -e "    ${GREEN}↳ price → $(field '.data.price'), tags → $(field '.data.tags')${RESET}"

# ─── LINK / UNLINK ────────────────────────────────────────────
section "LINK / UNLINK OPTION GROUPS ↔ PRODUCTS"

STATUS=$(call POST "$BASE/restaurants/$RESTO/products/$PROD_WOK_ID/option-groups" \
  "{\"optionGroupIds\":[\"$OG_CUISSON_ID\",\"$OG_EPICES_ID\"]}")
check "POST   /products/:id/option-groups (lier 2 groupes)" 200 "$STATUS" "$(body)"

STATUS=$(call POST "$BASE/restaurants/$RESTO/products/$PROD_POULET_ID/option-groups" \
  "{\"optionGroupIds\":[\"$OG_EPICES_ID\"]}")
check "POST   /products/:id/option-groups (lier 1 groupe)" 200 "$STATUS" "$(body)"

# Vérifier les liens via GET product
STATUS=$(call_public GET "$BASE/restaurants/$RESTO/products/$PROD_WOK_ID")
check "GET    /products/:id → optionGroups présents" 200 "$STATUS" "$(body)"
echo -e "    ${GREEN}↳ $(field '.data.optionGroups | length') groupe(s) sur le Wok${RESET}"

# Délier un groupe du wok
STATUS=$(call DELETE "$BASE/restaurants/$RESTO/products/$PROD_WOK_ID/option-groups/$OG_EPICES_ID")
check "DELETE /products/:id/option-groups/:ogId (délier)" 200 "$STATUS" "$(body)"

# Re-lier
STATUS=$(call POST "$BASE/restaurants/$RESTO/products/$PROD_WOK_ID/option-groups" \
  "{\"optionGroupIds\":[\"$OG_EPICES_ID\"]}")
check "POST   /products/:id/option-groups (re-lier)" 200 "$STATUS" "$(body)"

# ─── MENU PUBLIC ──────────────────────────────────────────────
section "MENU PUBLIC"

STATUS=$(call_public GET "$BASE/restaurants/$RESTO/menu")
check "GET    /menu (sans auth)" 200 "$STATUS" "$(body)"
echo -e "    ${GREEN}↳ $(field '.data | length') catégorie(s) dans le menu${RESET}"
while IFS= read -r line; do
  echo -e "    ${GREEN}$line${RESET}"
done < <(field '.data[] | "  • \(.name) — \(.productCategories | length) produit(s)"' 2>/dev/null || true)

# ─── RÉSUMÉ DES DONNÉES CRÉÉES ────────────────────────────────
section "DONNÉES CRÉÉES EN BASE"
echo -e "  Catégorie   Plats chauds            ${YELLOW}$CAT_PLATS_ID${RESET}"
echo -e "  OptionGroup Cuisson                 ${YELLOW}$OG_CUISSON_ID${RESET}"
echo -e "  OptionGroup Épices & condiments     ${YELLOW}$OG_EPICES_ID${RESET}"
echo -e "  Product     Wok de boeuf wagyu      ${YELLOW}$PROD_WOK_ID${RESET}"
echo -e "  Product     Bowl poulet teriyaki    ${YELLOW}$PROD_POULET_ID${RESET}"

# ─── RÉSULTAT ─────────────────────────────────────────────────
echo ""
echo -e "${BOLD}══════════════════════════════════${RESET}"
TOTAL=$((PASS + FAIL))
if [ $FAIL -eq 0 ]; then
  echo -e "${GREEN}${BOLD}  ✓ $PASS/$TOTAL tests passés${RESET}"
else
  echo -e "${RED}${BOLD}  ✗ $FAIL/$TOTAL échoués — $PASS/$TOTAL passés${RESET}"
fi
echo -e "${BOLD}══════════════════════════════════${RESET}"
echo ""
