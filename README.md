# Meeple Tavern

MVP SEO-first para descubrir juegos de mesa en español.

## Arranque local

Este proyecto usa Volta para fijar versiones de runtime:

- Node.js `22.12.0`
- npm `11.2.0`

Si tienes Volta instalado, al entrar en la carpeta del proyecto se usarán automáticamente.

1. Instala dependencias:

```bash
npm install
```

2. Crea tu `.env` desde el ejemplo:

```bash
cp .env.example .env
```

3. Configura `DATABASE_URL` con una base PostgreSQL.

Para Supabase en Vercel, usa el transaction pooler como `DATABASE_URL` y el session
pooler como `DIRECT_URL`:

```env
DATABASE_URL="postgresql://postgres.PROJECT_REF:PASSWORD@aws-1-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true&sslmode=require"
DIRECT_URL="postgresql://postgres.PROJECT_REF:PASSWORD@aws-1-eu-central-1.pooler.supabase.com:5432/postgres?sslmode=require"
```

4. Aplica Prisma y carga datos:

```bash
npm run db:migrate
npm run db:seed
```

5. Levanta Next.js:

```bash
npm run dev
```

Admin local por defecto en desarrollo:

- Usuario: `admin`
- Password: `meepletavern`

En producción define siempre `ADMIN_USERNAME` y `ADMIN_PASSWORD`.
