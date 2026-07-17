<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:dashboard-plan -->
# Dashboard Plan — Gestión de Activos

## Estructura del proyecto

```
app/
├── (backend)/
│   ├── actions/
│   │   ├── auth.ts              # Login/Register (existente)
│   │   └── portfolio.ts         # addAsset, removeAsset, getPortfolio, clearLiquidity, setCustomMEP
│   ├── api/
│   │   ├── dolar/mep/route.ts   # GET → DolarApi (MEP)
│   │   └── prices/
│   │       ├── crypto/route.ts  # GET → CoinMarketCap
│   │       └── stocks/route.ts  # GET → Yahoo Finance
│   ├── lib/
│   │   └── servicios/           # Login/Register services (existente)
│   ├── types/
│   │   ├── formState.ts         # (existente)
│   │   ├── logState.ts          # (existente)
│   │   └── portfolio.ts         # Asset*, PortfolioSummary, MEPRate
│   └── validations/auth.ts      # (existente)
├── (frontend)/
│   ├── dashboard/page.tsx       # Server component → getPortfolio()
│   ├── registro/page.tsx        # (existente)
│   └── ui/
│       ├── dashboard-content.tsx # Client component principal
│       ├── dashboard-summary.tsx # Cards de totales
│       ├── portfolio-modals.tsx  # AddAsset, ReduceAsset, DeleteConfirm, LiquidityModal
│       ├── positions-table.tsx   # Tabla de posiciones
│       ├── toast.tsx             # Toast notifications
│       └── components/button.tsx # (existente)
├── proxy.ts                     # Antes middleware.ts → export proxy
├── layout.tsx                   # (existente)
└── page.tsx                     # Login (existente)
```

## Flujo de datos

1. Dashboard → Server Component → getPortfolio() → Prisma + APIs externas
2. Agregar activo → Server Action addAsset → PPP: (q*ppp + q*price) / qTotal → Descontar de liquidez
3. Reducir/Eliminar → Server Action removeAsset → reduce o delete
4. Refrescar precios → getPortfolio() (re-ejecuta server component)
5. APIs externas: CoinMarketCap (cripto), Yahoo Finance v8/chart (CEDEARS), DolarApi (MEP)
6. Borrar liquidez → clearLiquidity() → liquidityARS = 0
7. MEP manual → setCustomMEP() → sobrescribe MEP de API si se provee

## PPP (Precio Promedio Ponderado)
PPP = (qty_actual * ppp_anterior + qty_nueva * precio_nuevo) / qty_total

## P&L
- P&L ARS = (currentPriceARS - purchasePriceARS) * quantity
- P&L USD = P&L ARS / CCL
- % P&L ARS = ((currentPriceARS - purchasePriceARS) / purchasePriceARS) * 100
- CEDEARs: purchasePriceARS se almacena en DB (precio original en ARS)
- Cripto: currentPriceUSD directo de CoinMarketCap

## APIs
- Cripto: CoinMarketCap Basic (free, 15K calls/mes)
- CEDEARS: Yahoo Finance v8/chart/{symbol}?interval=1d&range=1d
  - .BA → fetch directo (LLY.BA), Yahoo devuelve precio en ARS. Sin ratio, sin conversión.
  - No-.BA → fetch subyacente (LLY), se aplica ratio + CCL para obtener equivalente CEDEAR
- MEP: DolarApi /v1/dolares → filter casa === "bolsa"
- CCL: DolarApi /v1/dolares → filter casa === "contadoconliqui"

## Convenciones
- "use server" en actions, "use client" en UI interactiva
- Route handlers en app/(backend)/api/ (route group, URL sin (backend))
- middleware → proxy (Next.js 16 breaking change)
- cookies(), params, searchParams siempre con await
- fetch externo siempre desde servidor, nunca desde cliente
- shadcn/ui (base-nova) + Tailwind v4 + @base-ui/react
- Decimal(18,4) para USD, Decimal(18,8) para crypto
## CEDEARs — Precio en ARS y conversión USD

### Fórmula de ratio
- Ratio en cedears.json: `num:den` → 1 CEDEAR = 1/num de la acción subyacente
- Ejemplo: LLY 56:1 → 1 CEDEAR = 1/56 de LLY
- CEDEAR_USD = underlying_USD / ratio_num
- CEDEAR_ARS = CEDEAR_USD * CCL_venta

### Flujo de precio CEDEAR (.BA)
1. Usuario ingresa precio del CEDEAR en ARS (compra en pesos)
2. addAsset: convertir a CEDEAR USD = precio_ARS / CCL
3. Almacenar averagePrice como CEDEAR USD
4. Dashboard: fetch directo LLY.BA → precio ARS real del CEDEAR (sin ratio)
5. currentPriceUSD = currentPriceARS / CCL (para P&L USD)
6. purchasePriceARS = precio original en ARS (almacenado en DB)

### Flujo de precio CEDEAR (no-.BA, subyacente)
1. Dashboard: fetch LLY → precio USD del subyacente
2. Aplicar ratio: CEDEAR_USD = LLY_USD / 56
3. Convertir a ARS: CEDEAR_ARS = CEDEAR_USD * CCL

### Reglas clave
- .BA: Yahoo devuelve precio en ARS directo del CEDEAR. No se necesita ratio.
- No-.BA: Yahoo devuelve precio USD del subyacente. Se aplica ratio + CCL.
- La conversión USD → ARS y P&L USD usa **CCL** (no MEP) para CEDEARs
- CCL **NO** tiene fallback a MEP (si CCL no está disponible, el precio queda en 0)

### Cálculos por activo (CEDEAR .BA)
- Precio compra ARS: purchasePriceARS (almacenado en DB)
- Precio actual ARS: Yahoo directo (LLY.BA)
- Equivalente USD: currentPriceARS / CCL_venta
- P&L ARS: (precio_actual_ARS - precio_compra_ARS) * quantity
- P&L USD: (currentPriceUSD - averagePrice) * quantity
- % P&L: (P&L / invertido) * 100

### Cálculos de portafolio
- Invertido ARS: suma(precio_compra_ARS * qty)
- Invertido USD: suma(averagePrice * qty) ← averagePrice es CEDEAR USD
- No invertido: liquidityARS (parte del saldo total)
- Liquidez: se suma al total del portafolio
- Saldo Total ARS: totalValueARS + liquidityARS
- Saldo Total USD: totalValueUSD + (liquidityARS / MEP_venta)

### Datos existentes
- averagePrice en DB: CEDEAR USD (ej: ~$7.00 para GOOGL)
- purchasePriceARS en DB: ARS por unidad al momento de compra
- Para activos existentes sin purchasePriceARS: se calcula con CCL como fallback

## MEP Manual

### Flujo
1. Dashboard: input "MEP" en el header → setCustomMEP() → sobrescribe MEP de API
2. Formulario AddAsset: input opcional "Dólar MEP (compra)" → usa ese MEP para el cálculo
3. Si no se provee MEP manual, usa el de DolarApi (API)

### Prioridad MEP
- addAsset: mepCompra del form > MEP de API
- getPortfolio: customMEP del User > MEP de API
<!-- END:dashboard-plan -->

<!-- BEGIN:cedear-rules -->
# CEDEAR Rules

## Ratio
- `cedears.json` ratio format: `num:den` where num = underlying shares, den = CEDEARs
- 1 CEDEAR = 1/num of underlying share
- Example: LLY 56:1 → 1 CEDEAR = 1/56 of LLY share

## Price Flow
- User enters CEDEAR price in ARS (Argentine pesos)
- Backend converts to USD equivalent using: ARS_price / CCL (no ratio applied)
- Stored averagePrice is always CEDEAR USD for consistency
- Dashboard shows: ARS purchase price, ARS current price (from Yahoo direct .BA), USD equivalent (via CCL)

## Fetch Rules
- `.BA` symbols → fetch full symbol (LLY.BA) from Yahoo → price in ARS, no ratio applied
- Non-`.BA` symbols → fetch underlying (LLY), apply ratio + CCL for CEDEAR equivalent

## Formulas
- CEDEAR_USD = underlying_USD / ratio_num  (for non-.BA)
- currentPriceUSD = currentPriceARS / CCL_venta  (for .BA)
- CEDEAR_ARS = CEDEAR_USD * CCL_venta
- P&L USD = (currentPriceUSD - averagePrice) * quantity
- P&L ARS = (currentPriceARS - purchasePriceARS) * quantity
- purchasePriceARS = (averagePrice / ratio_num) * CCL
<!-- END:cedear-rules -->

<!-- BEGIN:changelog -->
# Changelog de Cambios

## 2026-07-15

### 1. Fix: P&L History no se ve sin activos
- **Archivo:** `app/(backend)/actions/portfolio.ts`
- **Cambio:** `getPortfolio()` movió la query de `PnLHistory` y el fetch de `user` antes del early return de `assets.length === 0`
- **Resultado:** El historial de operaciones ahora siempre está disponible, incluso sin activos en cartera

### 2. Dashboard reestructurado con tabs
- **Archivo:** `app/(frontend)/ui/dashboard-content.tsx`
- **Nuevas pestañas:** "Resumen" y "Historial"
- **Tab Resumen:** DashboardSummary + resumen rápido (P&L acumulado + Invertido histórico) + PositionsTable
- **Tab Historial:** Tabla de operaciones de venta + botón "Resetear invertido histórico"
- **Resultado:** Dashboard limpio, historial separado

### 3. DashboardSummary simplificado
- **Archivo:** `app/(frontend)/ui/dashboard-summary.tsx`
- **Cards:** Saldo Total ARS, Saldo Total USD, P&L ARS, P&L USD, MEP
- **Resultado:** Menos ruido, info más relevante

### 4. Fix: Reset now clears P&L accumulated
- **Schema:** Agregado `pnlResetDate DateTime?` al modelo `User`
- **Archivo:** `app/(backend)/actions/portfolio.ts`
- **Cambio:** `resetHistoricallyInvested()` ahora setea `pnlResetDate = new Date()` además de `totalHistoricallyInvestedARS = 0`
- **Cambio:** `getPortfolio()` filtra `pnlHistory` por `soldAt >= pnlResetDate` cuando existe
- **Resultado:** Al resetear, el P&L acumulado se recalcula solo con operaciones posteriores al reset

### 5. P&L acumulado: fecha y retorno %
- **Archivo:** `app/(frontend)/ui/dashboard-content.tsx`
- **Cambio:** Muestra "P&L acumulado desde [fecha]: $X (+Y%)" en ambos tabs
- **Cálculo:** Retorno % = (P&L acumulado / Invertido históricamente) × 100
- **Resultado:** El usuario ve desde cuándo se mide el P&L y el porcentaje de retorno

## 2026-07-14

### 1. purchasePriceARS en DB
- **Schema:** Agregado `purchasePriceARS Float?` al modelo `Asset` en `prisma/schema.prisma`
- **addAsset:** Guarda `purchasePriceARS` (ARS por unidad) para CEDEARs y crypto
- **getPortfolio:** Usa `purchasePriceARS` de DB si existe, con fallback al cálculo con CCL/MEP

### 2. Fix: Conversión USD→ARS para CEDEARs
- **Archivo:** `app/(backend)/actions/portfolio.ts`
- **Cambio:** `cclForCedears` ya no usa fallback a `mepVenta`
- **Cambio:** Línea 527: `mepVenta` → `cclForCedears` para conversión de CEDEARs no-.BA
- **Resultado:** Precio actual ARS ahora usa CCL, no MEP

### 3. Fix: averagePrice para CEDEARs
- **Archivo:** `app/(backend)/actions/portfolio.ts`
- **Cambio:** `addAsset` línea 284: `(price / cclValue) * ratio.num` → `price / cclValue`
- **Resultado:** `averagePrice` ahora almacena CEDEAR USD, no underlying USD
- **Nota:** Activos existentes mantienen valores incorrectos hasta recálculo manual

### 4. Fix: Eliminar activo (foreign key constraint)
- **Archivo:** `app/(backend)/actions/portfolio.ts`
- **Cambio:** `removeAsset` crea transacción con `assetId: null` cuando el asset se elimina completamente
- **Resultado:** No más error de foreign key constraint al eliminar activos

### 5. Columnas adicionales en tabla de posiciones
- **Archivo:** `app/(frontend)/ui/positions-table.tsx`
- **Nuevas columnas:** Total (ARS), Total (USD), Tiempo transcurrido
- **Formato tiempo:** Días totales desde la compra

## Notas importantes
- `averagePrice` para CEDEARs ahora es **CEDEAR USD** (ej: ~$7.00 para GOOGL), no underlying USD
- Para activos existentes con `averagePrice` en escala incorrecta, se necesita migración manual o recálculo
- CEDEARs usan **CCL** para conversión USD↔ARS, no MEP
<!-- END:changelog -->
