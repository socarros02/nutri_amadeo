// Función serverless de Vercel: única puerta de escritura a Supabase.
// Valida usuario/contraseña (variables de entorno) y usa la clave secreta,
// que nunca se envía al navegador.
import { createClient } from "@supabase/supabase-js";
import { randomUUID, timingSafeEqual, createHash } from "node:crypto";

const BUCKET = "comidas";
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const MEAL_TYPES = ["Desayuno", "Almuerzo", "Merienda", "Cena", "Extra"];
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

function safeEqual(a: string, b: string) {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

function isAuthorized(user: unknown, password: unknown) {
  const expectedUser = process.env.APP_USER;
  const expectedPassword = process.env.APP_PASSWORD;
  if (!expectedUser || !expectedPassword) return false;
  if (typeof user !== "string" || typeof password !== "string") return false;
  const userOk = safeEqual(user.trim().toLowerCase(), expectedUser.trim().toLowerCase());
  const passOk = safeEqual(password, expectedPassword);
  return userOk && passOk;
}

function isValidDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value));
}

function adminClient() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Faltan SUPABASE_URL / SUPABASE_SECRET_KEY en Vercel");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Solicitud inválida" }, 400);
  }

  if (!isAuthorized(body.user, body.password)) {
    return json({ error: "Usuario o contraseña incorrectos" }, 401);
  }

  try {
    if (body.action === "login") {
      return json({ ok: true });
    }

    if (body.action === "meal") {
      const { date, type, image } = body;
      const note = type === "Extra" && typeof body.note === "string" ? body.note.trim().slice(0, 60) : "";
      if (!isValidDate(date)) return json({ error: "Fecha inválida" }, 400);
      if (typeof type !== "string" || !MEAL_TYPES.includes(type)) return json({ error: "Tipo inválido" }, 400);
      if (typeof image !== "string") return json({ error: "Falta la foto" }, 400);

      const match = image.match(/^data:image\/(jpeg|png|webp);base64,(.+)$/);
      if (!match) return json({ error: "Formato de imagen no soportado" }, 400);
      const ext = match[1] === "jpeg" ? "jpg" : match[1];
      const bytes = Buffer.from(match[2], "base64");
      if (bytes.length > MAX_IMAGE_BYTES) return json({ error: "La foto es demasiado grande" }, 413);

      const supabase = adminClient();
      const path = `${date}/${randomUUID()}.${ext}`;
      const upload = await supabase.storage
        .from(BUCKET)
        .upload(path, bytes, { contentType: `image/${match[1]}`, upsert: false });
      if (upload.error) throw upload.error;

      const insert = await supabase
        .from("meals")
        .insert({ date, type, note: note || null, photo_path: path })
        .select()
        .single();
      if (insert.error) {
        await supabase.storage.from(BUCKET).remove([path]);
        throw insert.error;
      }
      return json({ ok: true, meal: insert.data });
    }

    if (body.action === "activity") {
      const { date, name, duration } = body;
      const minutes = Number(duration);
      if (!isValidDate(date)) return json({ error: "Fecha inválida" }, 400);
      if (typeof name !== "string" || !name.trim() || name.length > 80) return json({ error: "Actividad inválida" }, 400);
      if (!Number.isInteger(minutes) || minutes < 1 || minutes > 1440) return json({ error: "Duración inválida" }, 400);

      const supabase = adminClient();
      const insert = await supabase
        .from("activities")
        .insert({ date, name: name.trim(), duration: minutes })
        .select()
        .single();
      if (insert.error) throw insert.error;
      return json({ ok: true, activity: insert.data });
    }

    if (body.action === "delete-meal") {
      if (typeof body.id !== "string" || !UUID_RE.test(body.id)) return json({ error: "Registro inválido" }, 400);
      const supabase = adminClient();
      const removed = await supabase.from("meals").delete().eq("id", body.id).select("photo_path").maybeSingle();
      if (removed.error) throw removed.error;
      if (!removed.data) return json({ error: "Esa foto ya no existe" }, 404);
      const storage = await supabase.storage.from(BUCKET).remove([removed.data.photo_path]);
      if (storage.error) console.error("No se pudo borrar el archivo", storage.error);
      return json({ ok: true });
    }

    if (body.action === "delete-activity") {
      if (typeof body.id !== "string" || !UUID_RE.test(body.id)) return json({ error: "Registro inválido" }, 400);
      const supabase = adminClient();
      const removed = await supabase.from("activities").delete().eq("id", body.id).select("id").maybeSingle();
      if (removed.error) throw removed.error;
      if (!removed.data) return json({ error: "Esa actividad ya no existe" }, 404);
      return json({ ok: true });
    }

    return json({ error: "Acción desconocida" }, 400);
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : "Error del servidor";
    return json({ error: message }, 500);
  }
}
