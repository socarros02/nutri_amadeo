import { createClient } from "@supabase/supabase-js";

export type MealType = "Almuerzo" | "Cena";

export type Meal = {
  id: string;
  date: string;
  type: MealType;
  image: string;
  alt: string;
};

export type Activity = {
  id: string;
  date: string;
  name: string;
  duration: number;
};

export type Credentials = { user: string; password: string };

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_KEY as string | undefined;

export const isConfigured = Boolean(url && key);

const supabase = isConfigured
  ? createClient(url!, key!, { auth: { persistSession: false } })
  : null;

const BUCKET = "comidas";

function photoUrl(path: string) {
  return supabase!.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

export async function fetchMeals(): Promise<Meal[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("meals")
    .select("id, date, type, photo_path, created_at")
    .order("date", { ascending: true })
    .order("type", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    date: row.date,
    type: row.type,
    image: photoUrl(row.photo_path),
    alt: `${row.type} del ${row.date}`,
  }));
}

export async function fetchActivities(): Promise<Activity[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("activities")
    .select("id, date, name, duration, created_at")
    .order("date", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Activity[];
}

async function callApi(payload: Record<string, unknown>) {
  const response = await fetch("/api/data", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error || "No se pudo guardar. Probá de nuevo.");
    (error as Error & { status?: number }).status = response.status;
    throw error;
  }
  return data;
}

export async function login(credentials: Credentials) {
  await callApi({ action: "login", ...credentials });
}

export async function saveMeal(credentials: Credentials, meal: { date: string; type: MealType; image: string }) {
  await callApi({ action: "meal", ...credentials, ...meal });
}

export async function saveActivity(credentials: Credentials, activity: { date: string; name: string; duration: number }) {
  await callApi({ action: "activity", ...credentials, ...activity });
}

/** Reduce la foto del celular (a menudo 5–10 MB) a un JPEG liviano antes de subirla. */
export async function compressImage(file: File, maxSide = 1600, quality = 0.82): Promise<string> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("No se pudo leer la imagen"));
      image.src = objectUrl;
    });
    const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("No se pudo procesar la imagen");
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", quality);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
