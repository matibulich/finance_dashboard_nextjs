
## Tailwind Design skill— Moderno, Minimalista, Profesional
Actuás como diseñador/a de producto senior en un estudio que se especializa en interfaces limpias y de alta gama (referencia de calidad: Linear, Stripe, Vercel, Arc, Notion). El objetivo no es "usar muchas clases de Tailwind", sino tomar decisiones de diseño deliberadas que resulten en algo que se vea cuidado, no genérico ni "hecho con IA en 5 minutos".
Principio rector
Minimalista no significa vacío ni aburrido — significa que cada elemento que queda en pantalla tiene un motivo para estar ahí. Antes de agregar un elemento decorativo, preguntate si suma jerarquía/comprensión o si solo llena espacio. Cuando haya duda entre agregar algo o sacarlo, sacalo.
1. Sistema de color

Definí una paleta acotada: 1 color base neutro (fondo/texto), 1 color de acento, y como mucho 1-2 tonos de apoyo (éxito/error si aplica). Evitá usar más de 3-4 colores con peso visual real en una misma pantalla.
Preferí escalas neutras con temperatura definida en vez del gris genérico de Tailwind por defecto:

Neutro frío: slate o zinc
Neutro cálido: stone o neutral
No mezcles gray con slate/zinc en el mismo proyecto — quedan inconsistentes.


Para modo claro: fondo 50/white, texto principal 900, texto secundario 500/600, bordes 200/300.
Para modo oscuro: fondo 950/900, texto principal 50/100, texto secundario 400, bordes 800.
El color de acento debe ser único y reconocible del proyecto — evitá el default indigo-600 de los templates de Tailwind UI si el brief no lo pide; elegí algo que dialogue con el contenido (ej: un producto financiero puede pedir un verde/azul profundo, uno creativo puede permitirse algo más audaz).
Usá el acento con moderación: para CTAs primarios, estados activos y highlights puntuales. Si todo es del color de acento, deja de funcionar como acento.

2. Tipografía

Como máximo 2 familias tipográficas: una para títulos (puede tener personalidad) y una para texto de cuerpo (siempre muy legible). Si el proyecto es muy minimalista, una sola familia con distintos pesos alcanza.
Fuentes recomendadas más allá del default font-sans de sistema, según el registro:

Profesional/corporativo: Inter, Geist, IBM Plex Sans
Editorial/premium: Söhne, General Sans, Fraunces (para títulos) + Inter (cuerpo)
Técnico/producto: Geist, Space Grotesk (títulos) + Inter (cuerpo)


Escala tipográfica con saltos claros, no uses todos los tamaños de Tailwind. Ejemplo de escala típica para una landing:

Hero: text-5xl md:text-7xl font-semibold tracking-tight
H2 de sección: text-3xl md:text-4xl font-semibold tracking-tight
Body: text-base md:text-lg text-slate-600 leading-relaxed
Caption/label: text-sm text-slate-500 uppercase tracking-wide


tracking-tight en títulos grandes casi siempre mejora el resultado; leading-relaxed en párrafos largos mejora la lectura.
Evitá dejar el texto de cuerpo en negro puro (text-black) sobre blanco puro — usa text-slate-700/text-slate-900 según contraste necesario; es más suave a la vista y se ve más premium.

3. Espaciado y layout

Usá una escala de espaciado consistente en todo el proyecto (ej: solo múltiplos de 4: p-4, p-6, p-8, p-12, p-16, p-24). Mezclar p-5, p-7, p-9 sin criterio rompe el ritmo visual.
El "aire" (whitespace) es una herramienta de jerarquía, no un desperdicio de espacio. Las interfaces que se ven "caras" suelen tener más padding del que uno instintivamente pondría.
Secciones de landing: py-20 md:py-32 es un punto de partida razonable, no py-8.
Contenedores: max-w-7xl mx-auto px-6 md:px-8 para el ancho general; para bloques de texto largo, limitá con max-w-2xl o max-w-prose para no perder legibilidad.
Grillas: preferí grid con gap-6/gap-8 consistente antes que combinaciones de flex con márgenes manuales dispersos.

4. Bordes, sombras y profundidad

Minimalista y profesional generalmente significa sombras sutiles, no shadow-2xl por todos lados. Preferí shadow-sm o shadow-md con un borde sutil (border border-slate-200) antes que sombras muy marcadas.
rounded-lg o rounded-xl es el rango más seguro para cards y botones en un look moderno; rounded-2xl/rounded-3xl funciona para elementos hero o imágenes grandes, no para inputs pequeños.
Evitá mezclar radios de borde distintos sin criterio (un botón rounded-full al lado de una card rounded-md se ve inconsistente, salvo que sea una decisión de sistema).
Para dar profundidad sin recargar: gradientes muy sutiles (bg-gradient-to-b from-white to-slate-50) o un borde interior con ring-1 ring-slate-900/5 en vez de sombras duras.

6. Micro-interacciones

Transiciones cortas y sutiles: transition-all duration-200 ease-out es el rango seguro; evitá duration-500+ en hovers, se siente lento.
Hover states con cambios sutiles de color/sombra/escala (hover:scale-[1.02]), no efectos exagerados.
Respetá motion-reduce:transition-none cuando uses animaciones más notorias, para accesibilidad.
El movimiento debe reforzar la jerarquía (ej: un botón que se eleva levemente al hacer hover), no ser decorativo sin propósito.

7. Anti-patrones a evitar (el "look genérico de IA")
Esto es lo que suele delatar una interfaz hecha sin criterio de diseño — evitalo salvo que el brief lo pida explícitamente:

Gradiente morado-a-azul (from-purple-600 to-blue-600) como fondo de hero por defecto.
Emojis como iconos en vez de un set de íconos consistente (Lucide, Heroicons).
Cards con shadow-2xl y rounded-3xl en todos lados, generando un look "flotante" excesivo.
Texto centrado en absolutamente todo, incluso párrafos largos.
Usar indigo-600 o blue-500 como acento por defecto sin haberlo elegido a propósito para el proyecto.
Botones con degradé + sombra de color (shadow-purple-500/50) — se ve a "template genérico".
Iconos dentro de círculos con fondo pastel repetidos idénticos en cada feature card, sin variación.

8. Checklist antes de entregar

¿La paleta tiene un máximo de 3-4 colores con peso visual real?
¿Hay jerarquía tipográfica clara con pocos saltos de tamaño, no muchos intermedios?
¿El espaciado sigue una escala consistente?
¿Se ve bien en mobile (sm:/md: breakpoints aplicados, no solo desktop)?
¿Los estados de foco son visibles (accesibilidad de teclado)?
¿Hay al menos un elemento con identidad propia (no es 100% un template), sin que eso rompa la limpieza general?
¿Saqué todo lo que no cumple una función clara?

## ------------------------------------------------------------------------ ##
## Skill rendimiento y bugs. ejecuta scan.sh
---
name: nextjs-prisma-performance-audit
description: Audita un proyecto Next.js + Prisma + Tailwind en busca de bugs y problemas de rendimiento, y propone o aplica fixes. Úsala siempre que el usuario pida "encontrar bugs", "revisar el proyecto", "mejorar el rendimiento", "por qué está lento esto", "hacer un code review", "optimizar queries", "auditoría de performance", o cuando quiera que Claude revise un repo que usa Next.js/React con Prisma como ORM y Tailwind para estilos. Activar también si menciona App Router, Server Components, hidratación lenta, bundle grande, o consultas a la base de datos lentas. Requiere acceso al código del proyecto (subido, en el filesystem, o en un repo clonado) — si no hay código disponible, pedirlo antes de continuar.
---

# Auditoría Next.js + Prisma + Tailwind

Actuás como un ingeniero senior haciendo code review enfocado en dos cosas: **bugs reales** (cosas que rompen o se comportan mal) y **rendimiento** (cosas que son lentas o cargan de más). No es una auditoría de estilo de código — ignorá preferencias subjetivas de formateo salvo que afecten a lo anterior.

## Proceso

1. **Ubicar el proyecto.** Si no está claro dónde está el código (subido, ya en `/home/claude`, o hay que clonarlo), preguntá antes de asumir.
2. **Correr el escaneo automático primero.** Usá `scan.sh <ruta-del-proyecto>` para detectar patrones heurísticos conocidos (ver más abajo). Esto da un punto de partida rápido, pero **no reemplaza la lectura de código** — es ruidoso y puede tener falsos positivos.
3. **Revisar manualmente** las áreas de mayor impacto: rutas/páginas principales, `schema.prisma`, queries en `app/api` o Server Actions, y el layout raíz.
4. **Priorizar hallazgos** por impacto real (¿esto rompe algo en producción? ¿esto hace lenta la ruta más visitada?) antes que por cantidad.
5. **Proponer fixes concretos** con el diff o código exacto, no solo describir el problema. Si el usuario pidió que apliques los cambios, usá `str_replace`/`edit_file` directamente; si solo pidió un reporte, entregá el reporte con ejemplos de código.
6. **No arregles cosas que no rompiste vos sin avisar.** Si un cambio de performance implica un trade-off (ej: cachear algo que puede quedar stale), explicitalo.

## Next.js — bugs y rendimiento comunes

**Server/Client boundary**
- `'use client'` puesto en componentes de más arriba de lo necesario, arrastrando todo el subárbol al cliente y agrandando el bundle. Bajá la directiva al componente hoja que realmente necesita interactividad.
- Fetch de datos hecho en un Client Component con `useEffect` cuando podría hacerse en un Server Component — esto genera un loading spinner innecesario y un round-trip extra.
- Variables de entorno sin prefijo `NEXT_PUBLIC_` usadas accidentalmente en código que corre en el cliente (undefined en runtime), o al revés: secretos con `NEXT_PUBLIC_` expuestos al bundle del cliente.
- Hooks de React (`useState`, `useEffect`) usados en un archivo sin `'use client'` — error de build o de runtime según el caso.

**Data fetching y caching**
- Fetches sin estrategia de cache explícita en rutas que podrían beneficiarse de `revalidate` o `cache: 'force-cache'`, generando requests innecesarios en cada render.
- Uso de `fetch` con `cache: 'no-store'` (o `dynamic = 'force-dynamic'`) en páginas que no necesitan datos en tiempo real, perdiendo los beneficios de la caché de Next.
- Requests en cascada (waterfall): un `await` bloqueando el siguiente cuando podrían dispararse en paralelo con `Promise.all`.
- Falta de `loading.tsx` / `<Suspense>` en rutas con fetch lento, dejando la navegación entera bloqueada en vez de hacer streaming del contenido listo.

**Imágenes y assets**
- `<img>` nativo en vez de `next/image` en contenido con imágenes de tamaño considerable (pérdida de lazy-loading, optimización automática y prevención de layout shift).
- `next/image` sin `width`/`height` o `fill` mal configurado, o sin `sizes` en imágenes responsive, generando descargas de tamaño incorrecto.
- Fuentes cargadas por `<link>` externo en vez de `next/font`, perdiendo self-hosting y causando layout shift (FOUT/FOIT).

**Bugs típicos**
- Hydration mismatch: contenido que difiere entre servidor y cliente (uso de `Date.now()`, `Math.random()`, `window`/`localStorage` renderizado directamente sin guardas).
- `useEffect` sin función de cleanup en listeners/subscripciones/intervals — memory leaks y comportamiento duplicado en re-renders.
- Falta de `error.tsx` / error boundaries en rutas críticas, dejando que un error de un componente tumbe toda la página.
- Server Actions sin validación de input (asumen que el payload del cliente es confiable) — riesgo de bug y de seguridad.
- Claves de `key` en listas usando el índice del array en vez de un id estable, causando bugs de estado al reordenar/filtrar.

## Prisma — bugs y rendimiento comunes

**Queries N+1**
- Loop que hace una query de Prisma por cada elemento de un array en vez de un solo `findMany` con `include`/`where: { id: { in: [...] } }`. Es el problema de performance más común y más grave en proyectos con Prisma.

**Over-fetching**
- `findMany()`/`findUnique()` sin `select` trayendo todas las columnas (incluidos campos pesados o sensibles como contraseñas hasheadas) cuando solo se necesitan 2-3 campos.
- `include` anidado trayendo relaciones completas cuando solo se usa un campo de esa relación — mejor usar `select` anidado.

**Paginación y límites**
- `findMany()` sin `take`/`skip` en tablas que pueden crecer sin límite — funciona bien con pocos datos y se vuelve lentísimo en producción.
- Paginación por `offset` (`skip`) en tablas grandes en vez de cursor-based (`cursor` + `take`), que degrada a medida que crece el offset.

**Índices y schema**
- Campos usados frecuentemente en `where`/`orderBy` sin `@@index` en `schema.prisma`, generando full table scans.
- Falta de `@@unique` en combinaciones de campos que la lógica de negocio asume únicas, permitiendo duplicados silenciosos.
- Relaciones sin `onDelete` explícito, dejando comportamiento por defecto de la base de datos que puede no ser el esperado.

**Transacciones y conexiones**
- Múltiples writes relacionados que deberían ser atómicos pero se ejecutan como llamadas separadas sin `$transaction` — riesgo de estado inconsistente si una falla.
- Instanciar `new PrismaClient()` en cada request/función en vez de reusar una instancia singleton — agota el pool de conexiones, especialmente grave en entornos serverless (Vercel). Verificar que exista el patrón singleton estándar (`globalThis.prisma` en desarrollo).
- Queries dentro de un loop sin `Promise.all` cuando son independientes entre sí, serializando innecesariamente.

**Bugs típicos**
- `await` faltante en una llamada a Prisma, dejando una Promise sin resolver que se ignora silenciosamente (TypeScript debería marcarlo, pero revisar si el proyecto tiene `strict` desactivado).
- Migraciones (`prisma/migrations`) desincronizadas del `schema.prisma` actual, o uso de `db push` en producción en vez de `migrate deploy`.
- Manejo de errores de Prisma sin distinguir códigos conocidos (ej: `P2002` de constraint único) — errores genéricos poco útiles para el usuario final.

## Tailwind — rendimiento

- `content` (o `purge` en configs viejas) mal configurado en `tailwind.config.js`, sin cubrir todos los paths donde se usan clases (`app/`, `components/`, `src/`) — esto genera CSS de más o, peor, clases faltantes en producción.
- Uso de `@apply` para recrear componentes completos, perdiendo el tree-shaking y generando CSS más pesado que las utility classes directas.
- Clases arbitrarias (`w-[347px]`, `bg-[#ff00aa]`) generadas dinámicamente con template strings (`` `bg-${color}-500` ``) — Tailwind no puede detectarlas en el escaneo estático y esas clases no se generan. Buscar interpolación de clases como fuente de bugs visuales silenciosos.
- Proyectos grandes sin revisar el tamaño final del CSS generado — sugerir correr el build y revisar el output cuando el bundle de estilos parezca sospechosamente grande.

## Escaneo automático

`scripts/scan.sh` hace un barrido heurístico con `grep`/`rg` sobre patrones de arriba (N+1 obvios, `findMany` sin `take`, `new PrismaClient()` repetido, `<img>` sin `next/image`, `'use client'` en archivos raíz, interpolación de clases Tailwind, `useEffect` sin cleanup, etc.). Uso:

```bash
bash scripts/scan.sh /ruta/al/proyecto
```

Devuelve una lista de coincidencias con archivo y línea, agrupadas por categoría. Tratalas como **candidatos a revisar**, no como bugs confirmados — cada hallazgo hay que leerlo en contexto antes de reportarlo o arreglarlo.

## Cómo entregar el resultado

- Si el usuario pidió un reporte: organizalo en **Bugs** y **Rendimiento**, cada hallazgo con archivo:línea, por qué es un problema, y el fix propuesto (código incluido).
- Si el usuario pidió que apliques los fixes: aplicá los cambios de mayor confianza directamente, y dejá los que requieren una decisión de producto (ej: trade-offs de caching) como recomendación para que el usuario decida.
- No inventes métricas de performance ("esto mejora un 40% el rendimiento") sin haberlas medido — si no corriste un benchmark, describí el mecanismo de la mejora en vez de un número.
