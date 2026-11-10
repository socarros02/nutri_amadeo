// Genera un PDF tipo "menú semanal" con las fotos de los últimos N días.
// Portada oscura (Midnight Black + brillo Deep Azure) y una página A4 por día con registro.
import type { Activity, Meal } from "./api";
import { MEAL_TYPES } from "./api";

type RGB = [number, number, number];
const C = {
  black: [1, 5, 17] as RGB,
  azure: [0, 70, 222] as RGB,
  coral: [253, 115, 154] as RGB,
  paper: [244, 246, 252] as RGB,
  azureTint: [222, 230, 251] as RGB,
  line: [205, 213, 235] as RGB,
  muted: [92, 100, 124] as RGB,
  white: [255, 255, 255] as RGB,
};

const W = 210;
const H = 297;
const M = 16; // margen lateral

const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const WEEKDAYS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

function parse(key: string) {
  return new Date(`${key}T12:00:00`);
}
function keyOf(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function longDate(key: string) {
  const d = parse(key);
  return `${WEEKDAYS[d.getDay()]} ${d.getDate()} de ${MONTHS[d.getMonth()]}`;
}
function shortDate(key: string) {
  const d = parse(key);
  return `${d.getDate()} de ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}
function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function reportRange(endKey: string, days = 21) {
  const end = parse(endKey);
  const list: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(end);
    d.setDate(end.getDate() - i);
    list.push(keyOf(d));
  }
  return list;
}

export function summarize(meals: Meal[], activities: Activity[], endKey: string, days = 21) {
  const range = reportRange(endKey, days);
  const set = new Set(range);
  const m = meals.filter((x) => set.has(x.date));
  const a = activities.filter((x) => set.has(x.date));
  const daysWithMeals = new Set(m.map((x) => x.date)).size;
  return { range, meals: m, activities: a, daysWithMeals };
}

/** Descarga la foto y la recorta (tipo "cover") con esquinas redondeadas, lista para el PDF. */
async function photoTile(url: string, wMm: number, hMm: number, bg: RGB): Promise<string | null> {
  try {
    const res = await fetch(url, { mode: "cors" });
    if (!res.ok) return null;
    const bitmap = await createImageBitmap(await res.blob());
    const scale = 9; // px por mm (~230 dpi)
    const cw = Math.round(wMm * scale);
    const ch = Math.round(hMm * scale);
    const canvas = document.createElement("canvas");
    canvas.width = cw;
    canvas.height = ch;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = `rgb(${bg.join(",")})`;
    ctx.fillRect(0, 0, cw, ch);
    const r = 3.2 * scale;
    ctx.beginPath();
    ctx.roundRect(0, 0, cw, ch, r);
    ctx.clip();
    const s = Math.max(cw / bitmap.width, ch / bitmap.height);
    const dw = bitmap.width * s;
    const dh = bitmap.height * s;
    ctx.drawImage(bitmap, (cw - dw) / 2, (ch - dh) / 2, dw, dh);
    bitmap.close();
    return canvas.toDataURL("image/jpeg", 0.86);
  } catch {
    return null;
  }
}

function coverBackground(): string {
  const cw = 1240;
  const ch = Math.round((cw * H) / W);
  const canvas = document.createElement("canvas");
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#010511";
  ctx.fillRect(0, 0, cw, ch);
  const g = ctx.createRadialGradient(cw * 0.85, ch * 0.12, 0, cw * 0.85, ch * 0.12, cw * 1.15);
  g.addColorStop(0, "rgba(0,70,222,1)");
  g.addColorStop(0.45, "rgba(0,70,222,.38)");
  g.addColorStop(1, "rgba(0,70,222,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, cw, ch);
  return canvas.toDataURL("image/jpeg", 0.9);
}

export type ReportOptions = {
  meals: Meal[];
  activities: Activity[];
  endKey: string;
  days?: number;
  name?: string;
  onProgress?: (done: number, total: number) => void;
};

export async function generateReport({ meals, activities, endKey, days = 21, name = "Amadeo", onProgress }: ReportOptions) {
  const { jsPDF } = await import("jspdf");
  const { range, meals: inRange, activities: actsInRange, daysWithMeals } = summarize(meals, activities, endKey, days);
  const doc = new jsPDF({ unit: "mm", format: "a4", compress: true });

  const fill = (c: RGB) => doc.setFillColor(c[0], c[1], c[2]);
  const ink = (c: RGB) => doc.setTextColor(c[0], c[1], c[2]);
  const pill = (x: number, y: number, w: number, h: number, bg: RGB, fg: RGB, text: string, size: number, align: "left" | "right" = "left") => {
    const left = align === "right" ? x - w : x;
    fill(bg);
    doc.roundedRect(left, y, w, h, h / 2, h / 2, "F");
    ink(fg);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(size);
    doc.text(text, left + w / 2, y + h / 2, { align: "center", baseline: "middle" });
  };

  // ---------- Portada ----------
  doc.addImage(coverBackground(), "JPEG", 0, 0, W, H);
  ink(C.white);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(name, M, 24);
  doc.setFontSize(11);
  const tag = `Registro ${days} días`;
  pill(W - M, 17.5, doc.getTextWidth(tag) + 12, 9, C.coral, C.black, tag, 11, "right");

  doc.setFontSize(54);
  ink(C.white);
  doc.text("Registro de", W / 2, 128, { align: "center" });
  doc.text("alimentación", W / 2, 150, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(14);
  doc.setTextColor(200, 208, 235);
  doc.text(`Del ${shortDate(range[0])} al ${shortDate(range[range.length - 1])}`, W / 2, 166, { align: "center" });

  // Resumen
  const stats = [
    [String(inRange.length), "fotos de comidas"],
    [`${daysWithMeals}/${days}`, "días con registro"],
    [String(actsInRange.length), "actividades"],
  ];
  const boxW = 50;
  const gap = 7;
  const startX = (W - (boxW * 3 + gap * 2)) / 2;
  stats.forEach(([value, label], i) => {
    const x = startX + i * (boxW + gap);
    doc.setFillColor(14, 24, 58);
    doc.roundedRect(x, 196, boxW, 30, 5, 5, "F");
    ink(i === 1 ? C.coral : C.white);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text(value, x + boxW / 2, 210, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(180, 190, 225);
    doc.text(label, x + boxW / 2, 219, { align: "center" });
  });

  const missing = range.filter((d) => !inRange.some((m) => m.date === d));
  if (missing.length && missing.length < days) {
    doc.setFontSize(8.5);
    doc.setTextColor(150, 160, 200);
    const txt = `Días sin fotos: ${missing.map((d) => `${parse(d).getDate()}/${parse(d).getMonth() + 1}`).join(", ")}`;
    doc.text(doc.splitTextToSize(txt, W - 2 * M - 20), W / 2, 238, { align: "center" });
  }

  // Franjas inferiores (como la referencia)
  const stripes: RGB[] = [C.azure, C.coral, C.paper, [60, 110, 235]];
  stripes.forEach((c, i) => {
    fill(c);
    doc.rect((W / 4) * i, H - 10, W / 4 + 0.2, 10, "F");
  });

  // ---------- Páginas por día ----------
  const dayKeys = range.filter((d) => inRange.some((m) => m.date === d) || actsInRange.some((a) => a.date === d));
  const totalPhotos = inRange.length;
  let done = 0;
  onProgress?.(0, totalPhotos);

  for (const dayKey of dayKeys) {
    const dayIndex = range.indexOf(dayKey) + 1;
    const week = Math.ceil(dayIndex / 7);
    const dayMeals = inRange.filter((m) => m.date === dayKey);
    const dayActs = actsInRange.filter((a) => a.date === dayKey);

    doc.addPage();
    fill(C.paper);
    doc.rect(0, 0, W, H, "F");

    // Encabezado
    ink(C.azure);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.text("Registro diario", M, 30);
    ink(C.black);
    doc.setFontSize(34);
    doc.text("Alimentación", M, 45);
    doc.setDrawColor(C.black[0], C.black[1], C.black[2]);
    doc.setLineWidth(0.25);
    doc.line(M, 51, 118, 51);
    ink(C.azure);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(13);
    doc.text(cap(longDate(dayKey)), M, 59);

    pill(W - M, 22, 44, 12, week % 2 === 0 ? C.azure : C.coral, week % 2 === 0 ? C.white : C.black, `Semana ${week}`, 15, "right");
    pill(W - M, 38, 34, 11, C.black, C.white, `DÍA ${dayIndex}`, 14, "right");

    // Grilla de fotos (2 columnas), ordenadas por momento del día
    const ordered = [...dayMeals].sort((x, y) => MEAL_TYPES.indexOf(x.type) - MEAL_TYPES.indexOf(y.type));
    const missingTypes = MEAL_TYPES.filter((t) => t !== "Extra" && !dayMeals.some((m) => m.type === t));
    const perPage = 8;
    const chunks: Meal[][] = [];
    for (let i = 0; i < ordered.length; i += perPage) chunks.push(ordered.slice(i, i + perPage));
    if (!chunks.length) chunks.push([]);

    for (let c = 0; c < chunks.length; c++) {
      if (c > 0) {
        doc.addPage();
        fill(C.paper);
        doc.rect(0, 0, W, H, "F");
        ink(C.azure);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(13);
        doc.text(`${cap(longDate(dayKey))} · continuación`, M, 30);
      }
      const cells = chunks[c];
      const top = c === 0 ? 70 : 40;
      const bottom = dayActs.length || missingTypes.length ? 248 : 266;
      const single = cells.length === 1;
      const pageHasDesc = cells.some((m) => m.description);
      const rows = Math.max(1, Math.ceil(cells.length / 2));
      const rowH = Math.min(single ? 120 : 100, (bottom - top) / rows);
      const gapX = 6;
      const cellW = single ? W - 2 * M : (W - 2 * M - gapX) / 2;

      for (let i = 0; i < cells.length; i++) {
        const meal = cells[i];
        const col = i % 2;
        const row = Math.floor(i / 2);
        const x = M + col * (cellW + gapX);
        const y = top + row * rowH;
        const sameType = ordered.filter((m) => m.type === meal.type);
        const label = (meal.type === "Extra" && meal.note ? `extra · ${meal.note}` : meal.type.toLowerCase()) +
          (sameType.length > 1 ? ` ${sameType.indexOf(meal) + 1}` : "");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9.5);
        const chipW = Math.min(cellW, doc.getTextWidth(label) + 10);
        pill(x, y, chipW, 7.5, C.azureTint, C.black, label, 9.5);
        const descLines = meal.description ? (doc.setFont("helvetica", "normal"), doc.setFontSize(9), doc.splitTextToSize(meal.description, cellW).slice(0, 3)) : [];
        const reserve = pageHasDesc ? 14 : 0;
        const ph = rowH - 13 - reserve;
        const img = await photoTile(meal.image, cellW, ph, C.paper);
        if (descLines.length) {
          ink(C.black);
          doc.setFont("helvetica", "normal");
          doc.setFontSize(9);
          doc.text(descLines, x + 1, y + 10 + ph + 4.5, { lineHeightFactor: 1.25 });
        }
        if (img) doc.addImage(img, "JPEG", x, y + 10, cellW, ph);
        else {
          fill(C.azureTint);
          doc.roundedRect(x, y + 10, cellW, ph, 3.2, 3.2, "F");
        }
        done++;
        onProgress?.(done, totalPhotos);
      }

      if (!cells.length) {
        doc.setDrawColor(C.line[0], C.line[1], C.line[2]);
        doc.setLineDashPattern([1.5, 1.5], 0);
        doc.roundedRect(M, top, W - 2 * M, 40, 4, 4, "S");
        doc.setLineDashPattern([], 0);
        ink(C.muted);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(11);
        doc.text("Sin fotos de comidas este día", W / 2, top + 20, { align: "center", baseline: "middle" });
      }
    }

    if (missingTypes.length && dayMeals.length) {
      ink(C.muted);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(`Sin foto: ${missingTypes.map((t) => t.toLowerCase()).join(", ")}`, M, dayActs.length ? 253 : 266);
    }

    // Actividad del día
    if (dayActs.length) {
      fill(C.black);
      doc.roundedRect(M, 258, W - 2 * M, 12, 6, 6, "F");
      ink(C.coral);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text("ACTIVIDAD", M + 7, 264, { baseline: "middle" });
      ink(C.white);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      const txt = dayActs.map((a) => `${a.name} · ${a.duration} min`).join("   |   ");
      doc.text(doc.splitTextToSize(txt, W - 2 * M - 34)[0], M + 30, 264, { baseline: "middle" });
    }

    // Pie
    ink(C.azure);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("registro de", W / 2, 280, { align: "center" });
    ink(C.black);
    doc.setFontSize(17);
    doc.text(name, W / 2, 287, { align: "center" });
  }

  if (!dayKeys.length) {
    doc.addPage();
    fill(C.paper);
    doc.rect(0, 0, W, H, "F");
    ink(C.muted);
    doc.setFontSize(14);
    doc.text("No hay registros en este período.", W / 2, H / 2, { align: "center" });
  }

  const fileName = `registro-alimentacion-${range[0]}-al-${range[range.length - 1]}.pdf`;
  doc.save(fileName);
  return fileName;
}
