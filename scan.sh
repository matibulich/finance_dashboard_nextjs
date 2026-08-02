#!/usr/bin/env bash
# scan.sh — Escaneo heurístico de bugs/performance para proyectos Next.js + Prisma + Tailwind
# Uso: bash scan.sh /ruta/al/proyecto

set -uo pipefail

ROOT="${1:-.}"

if [ ! -d "$ROOT" ]; then
  echo "No existe el directorio: $ROOT"
  exit 1
fi

section() {
  echo ""
  echo "=================================================================="
  echo "$1"
  echo "=================================================================="
}

g() {
  grep -Rn \
    --include='*.ts' --include='*.tsx' \
    --include='*.js' --include='*.jsx' \
    --include='*.prisma' \
    --exclude-dir=node_modules --exclude-dir=.next \
    --exclude-dir=dist --exclude-dir=build \
    "$@" "$ROOT" 2>/dev/null
}

run() {
  local desc="$1"
  local pattern="$2"
  echo ""
  echo "--- $desc ---"
  g "$pattern" | head -n 40
  local count
  count=$(g "$pattern" | wc -l)
  echo "(coincidencias: $count)"
}

section "NEXT.JS — Server/Client boundary"
run "use client en layout/page raiz" "use client"
run "img nativo en vez de next/image" "<img "
run "window/localStorage sin guarda (hydration)" "window\.\|localStorage\."
run "Date.now() o Math.random() en render" "Date\.now()\|Math\.random()"

section "NEXT.JS — Data fetching y caching"
run "fetch con cache no-store" "no-store"
run "dynamic = force-dynamic" "force-dynamic"
run "useEffect" "useEffect("

section "NEXT.JS — Fuentes y estilos"
run "link externo a fuentes" "fonts.googleapis.com"

section "PRISMA — Instanciacion de cliente"
run "new PrismaClient()" "new PrismaClient("

section "PRISMA — Queries sin limite"
run "findMany()" ".findMany("

section "PRISMA — Transacciones"
run "prisma.\$transaction" 'prisma\.$transaction'

section "TAILWIND — Clases dinamicas"
run "clases interpoladas" '${'

section "GENERAL — console.log"
run "console.log" "console.log("

echo ""
echo "=================================================================="
echo "Fin del escaneo."
echo "=================================================================="
