# Finance Dashboard

Dashboard financiero personal para gestionar portafolios de CEDEARs y criptomonedas, con precios en tiempo real y seguimiento de P&L.

## Funcionalidades

- **Portafolio de activos** — Agregar, vender y eliminar CEDEARs y criptomonedas
- **Precios en tiempo real** — CoinMarketCap (cripto), Yahoo Finance (CEDEARs), DolarApi (MEP/CCL)
- **Cálculo PPP** — Precio Promedio Ponderado automático
- **P&L completo** — Ganancia/pérdida en ARS y USD, por activo y acumulado
- **Historial de operaciones** — Registro de ventas realizadas con P&L por operación
- **Dolar MEP manual** — Override del dólar MEP desde el dashboard o al agregar activo
- **Liquidez** — Rastreo de dinero no invertido en pesos
- **Dark mode** — Tema claro/oscuro con persistencia en localStorage

## Stack

- **Framework:** Next.js 16 (App Router, React 19)
- **Base de datos:** PostgreSQL + Prisma ORM
- **Estilos:** Tailwind CSS v4 + shadcn/ui
- **Auth:** JWT + bcrypt
- **APIs externas:** CoinMarketCap, Yahoo Finance, DolarApi

## Requisitos

- Node.js 18+
- PostgreSQL
- API keys:
  - `CMC_API_KEY` — [CoinMarketCap](https://coinmarketcap.com/api/) (free tier: 15K calls/mes)

## Instalación

```bash
# Clonar el repositorio
git clone https://github.com/matibulich/finance_dashboard_nextjs.git
cd finance_dashboard_nextjs

# Instalar dependencias
pnpm install

# Configurar variables de entorno
cp .env.schema .env
# Editar .env con tus valores

# Generar cliente Prisma
npx prisma generate

# Ejecutar migraciones
npx prisma db push

# Iniciar desarrollo
pnpm dev
```

Abrí [http://localhost:3000](http://localhost:3000) en el navegador.

## Variables de entorno

| Variable | Descripción |
|----------|-------------|
| `DATABASE_URL` | URL de conexión a PostgreSQL |
| `JWT_SECRET` | Secreto para firmar tokens JWT |
| `CMC_API_KEY` | API key de CoinMarketCap |

## Estructura

```
app/
├── (backend)/
│   ├── actions/          # Server Actions (auth, portfolio)
│   ├── api/              # Route handlers (dolar, prices)
│   ├── lib/              # Utilidades, servicios, cedears
│   └── types/            # Tipos TypeScript
├── (frontend)/
│   ├── dashboard/        # Página principal (server component)
│   ├── registro/         # Registro de usuario
│   └── ui/               # Componentes client (dashboard, modals, table)
├── globals.css           # Estilos globales + CSS variables
├── layout.tsx            # Root layout con ThemeProvider
└── page.tsx              # Login
prisma/
└── schema.prisma         # Schema de base de datos
cedears.json              # Ratios de CEDEARs
```

## Licencia

Proyecto privado.
