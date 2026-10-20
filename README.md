# Mi registro: alimentación y actividad física

App React + Vite. Las fotos y los datos se guardan en **Supabase**; se publica en **Vercel**.

- **Ver** (Alimentación / Actividad física): sin login, para vos y tu nutricionista.
- **Cargar datos**: pide usuario y contraseña. Se validan en el servidor (`/api/data`), no en el navegador.

---

## 1. Crear la base en Supabase (5 min)

1. Entrá a https://supabase.com → **New project** (plan Free alcanza). Elegí región **São Paulo** (la más cercana a Argentina).
2. Menú izquierdo **SQL Editor** → **New query** → pegá todo el contenido de `supabase/schema.sql` → **Run**.
   Esto crea las tablas `meals` y `activities`, y el bucket de fotos `comidas`.
3. Menú **Project Settings → API Keys** (o **API**) y copiá:
   - **Project URL** → `https://xxxx.supabase.co`
   - **Publishable key** (`sb_publishable_...`) o la **anon** key
   - **Secret key** (`sb_secret_...`) o la **service_role** key. ⚠️ Esta es privada: no la compartas.

## 2. Subir el código a GitHub

1. Creá un repositorio nuevo en https://github.com/new (puede ser **privado**).
2. Subí el contenido de esta carpeta (botón *uploading an existing file*, arrastrás todo, **Commit**).
   No subas `node_modules` ni `.env` si los tuvieras.

## 3. Publicar en Vercel

1. Entrá a https://vercel.com → **Add New → Project** → importá el repositorio.
2. Vercel detecta **Vite** solo. No cambies nada de *Build settings*.
3. Abrí **Environment Variables** y cargá estas 5:

   | Nombre | Valor |
   |---|---|
   | `VITE_SUPABASE_URL` | Project URL de Supabase |
   | `VITE_SUPABASE_KEY` | Publishable / anon key |
   | `SUPABASE_SECRET_KEY` | Secret / service_role key |
   | `APP_USER` | `Amadeo` |
   | `APP_PASSWORD` | `1234` (o la que quieras) |

4. **Deploy**. En ~1 minuto tenés tu link `https://tu-proyecto.vercel.app`.

> Si cambiás una variable después, hacé **Deployments → ⋯ → Redeploy** para que tome efecto.

## Cómo funciona

```
Navegador ──lee (clave pública, solo lectura)──▶ Supabase (tablas + fotos)
Navegador ──guarda (usuario+contraseña)──▶ /api/data en Vercel ──clave secreta──▶ Supabase
```

- Las fotos se achican en el celular (máx. 1600 px, JPEG) antes de subir: rápidas y ocupan poco.
  El plan Free de Supabase (1 GB) alcanza para miles de fotos.
- La contraseña nunca está en el código de la página; vive solo en las variables de Vercel.
- El sitio tiene `noindex`, así que no aparece en Google.

## Borrar o corregir un registro

Desde Supabase → **Table Editor** → `meals` o `activities` → seleccionás la fila → **Delete**.
(La foto queda en **Storage → comidas**; podés borrarla ahí también.)

## Probar en tu compu (opcional)

```bash
npm install
cp .env.example .env    # y completá los valores
npx vercel dev          # levanta la página y la función /api
```
