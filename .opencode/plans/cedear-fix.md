# Plan: Fix CEDEAR Price Calculation

## Problema

1. **Precio actual no se muestra**: Yahoo Finance timeout para simbolos `.BA` (ej: `LLY.BA`). El error se traga silenciosamente y todos los precios quedan en 0/null.

2. **Precio de compra incorrecto**: `purchasePriceARS` se reconstruye usando el CCL actual, pero el CCL puede haber cambiado desde la compra. Ej:
   - Usuario compro a 50,000 ARS con CCL=1300
   - `averagePrice = (50000/1300)*56 = 2153.85` (underlying USD)
   - Si CCL hoy es 1400: `purchasePriceARS = (2153.85/56)*1400 = 53,846` <- incorrecto

## Solucion

Agregar campo `purchasePriceARS` a la DB para almacenar directamente lo que el usuario pago en ARS.

---

## Cambios

### 1. Schema Prisma (`prisma/schema.prisma`)

Agregar al modelo `Asset`:
```prisma
purchasePriceARS Float?
```

Ejecutar migracion:
```bash
npx prisma migrate dev --name add-purchase-price-ars
```

### 2. addAsset (`app/(backend)/actions/portfolio.ts`)

**Nuevo activo (CEDEAR `.BA`):**
```typescript
// price = precio de compra por unidad en ARS
await prisma.asset.create({
  data: {
    ...
    averagePrice: Math.round(storedPrice * 10000) / 10000, // underlying USD
    purchasePriceARS: Math.round(price * 100) / 100, // ARS por unidad
  },
});
```

**Existing asset (PPP en ARS):**
```typescript
const qtyActual = Number(existing.quantity);
const qtyTotal = qtyActual + quantity;
const existingTotalARS = Number(existing.purchasePriceARS ?? 0) * qtyActual;
const newTotalARS = price * quantity;
const avgPurchaseARS = (existingTotalARS + newTotalARS) / qtyTotal;

await prisma.asset.update({
  data: {
    quantity: qtyTotal,
    averagePrice: Math.round(nuevoPPP * 10000) / 10000,
    purchasePriceARS: Math.round(avgPurchaseARS * 100) / 100,
  },
});
```

**Crypto:**
```typescript
const mep = await fetchMEP();
// Guardar purchasePriceARS para crypto tambien
```

### 3. getPortfolio (`app/(backend)/actions/portfolio.ts`)

**Mapping de assets:**

```typescript
// Para CEDEAR .BA con precio directo de Yahoo:
if (a.symbol.endsWith(".BA") && stockPrice.priceARS !== null) {
  currentPriceARS = stockPrice.priceARS;
  currentPriceUSD = cclForCedears > 0
    ? Math.round((stockPrice.priceARS / cclForCedears) * 100) / 100
    : 0;
  // Usar purchasePriceARS de DB si existe, sino reconstruir con CCL
  purchasePriceARS = a.purchasePriceARS != null
    ? a.purchasePriceARS
    : ratio
      ? Math.round((avgPrice / ratio.num) * cclForCedears * 100) / 100
      : null;
}

// Para CEDEAR fallback (subyacente):
} else if (a.symbol.endsWith(".BA") && stockFallbacks[a.symbol] && ratio) {
  const fallback = stockFallbacks[a.symbol];
  currentPriceUSD = Math.round((fallback.priceUSD / ratio.num) * 100) / 100;
  if (cclForCedears > 0) {
    currentPriceARS = Math.round(currentPriceUSD * cclForCedears * 100) / 100;
  }
  purchasePriceARS = a.purchasePriceARS != null
    ? a.purchasePriceARS
    : Math.round((avgPrice / ratio.num) * cclForCedears * 100) / 100;
}

// Para crypto:
if (a.type === AssetType.CRYPTO) {
  purchasePriceARS = a.purchasePriceARS != null
    ? a.purchasePriceARS
    : mepVenta > 0
      ? Math.round(avgPrice * mepVenta * 100) / 100
      : null;
}
```

### 4. P&L con purchasePriceARS

```typescript
// P&L ARS: usar purchasePriceARS almacenado
const pnlARS = purchasePriceARS !== null && currentPriceARS !== null
  ? Math.round((currentPriceARS - purchasePriceARS) * qty * 100) / 100
  : 0;

// P&L USD: derivado del ARS
const pnlUSD = cclForCedears > 0
  ? Math.round(pnlARS / cclForCedears * 100) / 100
  : 0;

// % P&L ARS
const pnlPercentARS = purchasePriceARS !== null && purchasePriceARS > 0 && currentPriceARS !== null
  ? Math.round(((currentPriceARS - purchasePriceARS) / purchasePriceARS) * 10000) / 100
  : 0;
```

### 5. Fallback para Yahoo timeout (ya implementado)

En `fetchStockPrices`: cuando `.BA` falla, buscar subyacente y guardar en `fallbacks`.
En `getPortfolio`: usar fallback para calcular precios del CEDEAR.

---

## Archivos a modificar

| Archivo | Cambio |
|---------|--------|
| `prisma/schema.prisma` | Agregar `purchasePriceARS Float?` a Asset |
| `app/(backend)/actions/portfolio.ts` | addAsset: guardar purchasePriceARS |
| `app/(backend)/actions/portfolio.ts` | getPortfolio: usar purchasePriceARS de DB |
| `app/(backend)/actions/portfolio.ts` | fetchStockPrices: fallback .BA -> subyacente (ya hecho) |
| `app/(backend)/types/portfolio.ts` | Agregar purchasePriceARS al type AssetWithPrice |

## Datos existentes

- Assets sin `purchasePriceARS` (null): usar reconstruccion con CCL como fallback
- Assets nuevos: guardar purchasePriceARS directamente
