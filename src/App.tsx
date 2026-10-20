import React, { FormEvent, ReactNode, TouchEvent, useCallback, useEffect, useState } from "react";
import {
  Activity,
  Credentials,
  Meal,
  MEAL_TYPES,
  MealType,
  deleteActivity,
  deleteMeal,
  compressImage,
  fetchActivities,
  fetchMeals,
  isConfigured,
  login,
  saveActivity,
  saveMeal,
} from "./lib/api";

type Screen =
  | "home"
  | "food"
  | "activity"
  | "login"
  | "load"
  | "add-food"
  | "add-activity";

const COLORS = {
  peach: "#F8B195",
  coral: "#F67280",
  mauve: "#C06C84",
  violet: "#6C5B7B",
  navy: "#355C7D",
};

const MONTHS = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

const DAYS = ["L", "M", "M", "J", "V", "S", "D"];

function dateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function Icon({
  name,
  size = 24,
}: {
  name: "arrow" | "trash" | "plate" | "shoe" | "plus" | "camera" | "calendar" | "clock" | "user" | "lock" | "chevron";
  size?: number;
}) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  const paths: Record<string, ReactNode> = {
    arrow: <><path d="m15 18-6-6 6-6" /><path d="M9 12h10" /></>,
    plate: <><circle cx="12" cy="12" r="6.5" /><path d="M3.5 4v6M6 4v6M4.75 10v10M20 4v16M17.5 4v5c0 1.5.9 2.5 2.5 2.5" /></>,
    shoe: <><path d="M4 16.5c3.5-1.2 5-4.5 5.4-8.6l3.2 1.6c1.4 3.2 3.7 4.4 7.4 4.8v3.2c-5.2 1.5-10.8 1.5-16.7.1Z" /><path d="m11 11 2.3-1M12.8 13l2.3-1" /></>,
    plus: <><path d="M12 5v14M5 12h14" /></>,
    camera: <><path d="M4 8.5h3l1.5-2h7l1.5 2h3v10H4z" /><circle cx="12" cy="13.5" r="3" /></>,
    calendar: <><rect x="3.5" y="5" width="17" height="15" rx="2" /><path d="M7.5 3v4M16.5 3v4M3.5 9.5h17" /></>,
    clock: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7v5l3.5 2" /></>,
    user: <><circle cx="12" cy="8" r="3.5" /><path d="M5.5 20c.6-4 2.8-6 6.5-6s5.9 2 6.5 6" /></>,
    lock: <><rect x="5" y="10" width="14" height="10" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v2.5" /></>,
    chevron: <path d="m9 18 6-6-6-6" />,
    trash: <><path d="M4 7h16M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13M10 11v5.5M14 11v5.5" /></>,
  };
  return <svg {...common}>{paths[name]}</svg>;
}

function Header({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <header className="topbar">
      <button className="icon-button" onClick={onBack} aria-label="Volver">
        <Icon name="arrow" />
      </button>
      <div className="header-title">{title}</div>
      <div className="header-spacer" />
    </header>
  );
}

function Calendar({
  markedDates,
  selected,
  onSelect,
}: {
  markedDates: string[];
  selected: string;
  onSelect: (date: string) => void;
}) {
  const initial = new Date(`${selected}T12:00:00`);
  const [month, setMonth] = useState(new Date(initial.getFullYear(), initial.getMonth(), 1));
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const startOffset = (new Date(month.getFullYear(), month.getMonth(), 1).getDay() + 6) % 7;
  const cells = Array.from({ length: 42 }, (_, index) => {
    const day = index - startOffset + 1;
    return day > 0 && day <= daysInMonth ? day : null;
  });

  function moveMonth(direction: number) {
    setMonth(new Date(month.getFullYear(), month.getMonth() + direction, 1));
  }

  return (
    <section className="calendar-card" aria-label="Calendario mensual">
      <div className="calendar-heading">
        <button className="calendar-arrow" onClick={() => moveMonth(-1)} aria-label="Mes anterior">
          <Icon name="arrow" size={20} />
        </button>
        <div className="month-title">
          {MONTHS[month.getMonth()]} <span>{month.getFullYear()}</span>
        </div>
        <button className="calendar-arrow next" onClick={() => moveMonth(1)} aria-label="Mes siguiente">
          <Icon name="arrow" size={20} />
        </button>
      </div>
      <div className="calendar-grid weekdays">
        {DAYS.map((day, index) => <div key={`${day}-${index}`}>{day}</div>)}
      </div>
      <div className="calendar-grid">
        {cells.map((day, index) => {
          if (!day) return <div key={`empty-${index}`} />;
          const key = dateKey(new Date(month.getFullYear(), month.getMonth(), day));
          const isSelected = selected === key;
          const isMarked = markedDates.includes(key);
          return (
            <button
              key={key}
              className={`day ${isSelected ? "selected" : ""}`}
              onClick={() => onSelect(key)}
              aria-label={`${day} de ${MONTHS[month.getMonth()]}${isMarked ? ", con registro" : ""}`}
            >
              <span>{day}</span>
              {isMarked && <i />}
            </button>
          );
        })}
      </div>
    </section>
  );
}

function Home({ navigate }: { navigate: (screen: Screen) => void }) {
  return (
    <main className="screen gradient-screen home-screen">
      <div className="home-header">
        <div className="eyebrow">TU BIENESTAR</div>
        <h1>Hola, Amadeo</h1>
        <p>¿Qué querés revisar hoy?</p>
      </div>
      <div className="home-content">
        <button className="feature-card" onClick={() => navigate("food")}>
          <span className="feature-icon"><Icon name="plate" size={30} /></span>
          <span className="feature-copy"><strong>Alimentación</strong><small>Revisá tus comidas del mes</small></span>
          <Icon name="chevron" size={21} />
        </button>
        <button className="feature-card secondary" onClick={() => navigate("activity")}>
          <span className="feature-icon"><Icon name="shoe" size={30} /></span>
          <span className="feature-copy"><strong>Actividad física</strong><small>Seguí tu movimiento diario</small></span>
          <Icon name="chevron" size={21} />
        </button>
        <button className="primary-button load-button" onClick={() => navigate("login")}>
          <Icon name="plus" size={20} /> Cargar datos
        </button>
      </div>
      <p className="home-note">Pequeños hábitos, grandes cambios.</p>
    </main>
  );
}

function FoodScreen({
  meals,
  navigate,
  onDelete,
}: {
  meals: Meal[];
  navigate: (screen: Screen) => void;
  onDelete?: (meal: Meal) => Promise<boolean>;
}) {
  const [selected, setSelected] = useState(dateKey(new Date()));
  const [carousel, setCarousel] = useState<number | null>(null);
  const [touchStart, setTouchStart] = useState(0);
  const selectedMeals = meals.filter((meal) => meal.date === selected);
  const marked = [...new Set(meals.map((meal) => meal.date))];
  const [deleting, setDeleting] = useState<string | null>(null);

  async function remove(meal: Meal) {
    if (!onDelete) return;
    setDeleting(meal.id);
    const removed = await onDelete(meal);
    setDeleting(null);
    if (removed && carousel !== null) {
      const remaining = selectedMeals.length - 1;
      setCarousel(remaining ? Math.min(carousel, remaining - 1) : null);
    }
  }

  function swipe(event: TouchEvent) {
    if (carousel === null || selectedMeals.length < 2) return;
    const delta = touchStart - event.changedTouches[0].clientX;
    if (Math.abs(delta) > 45) {
      setCarousel((carousel + (delta > 0 ? 1 : -1) + selectedMeals.length) % selectedMeals.length);
    }
  }

  if (carousel !== null && selectedMeals[carousel]) {
    const meal = selectedMeals[carousel];
    const date = new Date(`${meal.date}T12:00:00`);
    const label = new Intl.DateTimeFormat("es-AR", { weekday: "long", day: "2-digit", month: "2-digit" }).format(date);
    return (
      <main className="screen carousel-screen" onTouchStart={(e) => setTouchStart(e.touches[0].clientX)} onTouchEnd={swipe}>
        <header className="carousel-header">
          <button className="icon-button light" onClick={() => setCarousel(null)} aria-label="Cerrar carrusel"><Icon name="arrow" /></button>
          <div>Comidas del día</div><div className="header-spacer" />
        </header>
        <div className="carousel-stage">
          <img src={meal.image} alt={meal.alt} />
          {selectedMeals.length > 1 && (
            <>
              <button className="carousel-nav prev" aria-label="Foto anterior" onClick={() => setCarousel((carousel - 1 + selectedMeals.length) % selectedMeals.length)}><Icon name="arrow" /></button>
              <button className="carousel-nav next" aria-label="Foto siguiente" onClick={() => setCarousel((carousel + 1) % selectedMeals.length)}><Icon name="arrow" /></button>
            </>
          )}
        </div>
        <div className="carousel-caption">
          <div className="carousel-date">{label.charAt(0).toUpperCase() + label.slice(1)}</div>
          <div className="meal-type">{mealLabel(meal)}</div>
          <div className="dots" aria-label={`Foto ${carousel + 1} de ${selectedMeals.length}`}>
            {selectedMeals.map((item, index) => <i className={index === carousel ? "active" : ""} key={item.id} />)}
          </div>
          <small>Deslizá para ver más</small>
          {onDelete && (
            <button className="carousel-delete" onClick={() => remove(meal)} disabled={deleting === meal.id}>
              <Icon name="trash" size={16} /> {deleting === meal.id ? "Borrando…" : "Borrar esta foto"}
            </button>
          )}
        </div>
      </main>
    );
  }

  return (
    <main className="screen content-screen">
      <Header title="Alimentación" onBack={() => navigate("home")} />
      <div className="scroll-content">
        <Calendar markedDates={marked} selected={selected} onSelect={setSelected} />
        <section className="section-block">
          <div className="section-heading">
            <div><span className="section-kicker">REGISTRO DEL DÍA</span><h2>Mis comidas</h2></div>
            {selectedMeals.length > 0 && <span className="count-badge">{selectedMeals.length}</span>}
          </div>
          {selectedMeals.length ? (
            <>
              <div className="photo-grid">
                {selectedMeals.map((meal, index) => (
                  <div className={`food-photo ${deleting === meal.id ? "is-deleting" : ""}`} key={meal.id}>
                    <button className="food-open" onClick={() => setCarousel(index)} aria-label={`Ver ${meal.type} en grande`}>
                      <img src={meal.image} alt={meal.alt} />
                    </button>
                    <span>{mealLabel(meal)}</span>
                    {onDelete && (
                      <button className="photo-delete" onClick={() => remove(meal)} disabled={deleting === meal.id} aria-label={`Borrar foto de ${meal.type}`}>
                        <Icon name="trash" size={17} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button className="outline-button" onClick={() => setCarousel(0)}>Ver en carrusel <Icon name="chevron" size={18} /></button>
            </>
          ) : <div className="empty-state"><Icon name="plate" size={30} /><p>No hay comidas registradas este día.</p><button onClick={() => navigate("login")}>Agregar una comida</button></div>}
        </section>
      </div>
    </main>
  );
}

function ActivityScreen({
  activities,
  navigate,
  onDelete,
}: {
  activities: Activity[];
  navigate: (screen: Screen) => void;
  onDelete?: (activity: Activity) => Promise<boolean>;
}) {
  const [selected, setSelected] = useState(dateKey(new Date()));
  const [deleting, setDeleting] = useState<string | null>(null);
  async function remove(activity: Activity) {
    if (!onDelete) return;
    setDeleting(activity.id);
    await onDelete(activity);
    setDeleting(null);
  }
  const dayActivities = activities.filter((item) => item.date === selected);
  return (
    <main className="screen content-screen">
      <Header title="Actividad física" onBack={() => navigate("home")} />
      <div className="scroll-content">
        <Calendar markedDates={[...new Set(activities.map((item) => item.date))]} selected={selected} onSelect={setSelected} />
        <section className="section-block">
          <div className="section-heading"><div><span className="section-kicker">REGISTRO DEL DÍA</span><h2>Mi actividad</h2></div></div>
          {dayActivities.length ? (
            <div className="activity-list">
              {dayActivities.map((activity) => (
                <div className={`activity-card ${deleting === activity.id ? "is-deleting" : ""}`} key={activity.id}>
                  <span className="activity-icon"><Icon name="shoe" size={30} /></span>
                  <div className="activity-copy"><small>ACTIVIDAD</small><strong>{activity.name}</strong><span><Icon name="clock" size={16} /> {activity.duration} min</span></div>
                  {onDelete ? (
                    <button className="activity-delete" onClick={() => remove(activity)} disabled={deleting === activity.id} aria-label={`Borrar ${activity.name}`}>
                      <Icon name="trash" size={18} />
                    </button>
                  ) : <div className="activity-check">✓</div>}
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state activity-empty"><Icon name="calendar" size={30} /><p>Sin actividad registrada</p><button onClick={() => navigate("login")}>Agregar actividad</button></div>
          )}
        </section>
      </div>
    </main>
  );
}

function Login({ navigate, onSuccess }: { navigate: (screen: Screen) => void; onSuccess: (credentials: Credentials) => void }) {
  const [user, setUser] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const credentials = { user: user.trim(), password };
      await login(credentials);
      onSuccess(credentials);
    } catch (err) {
      const status = (err as { status?: number }).status;
      setError(status === 401 ? "Usuario o contraseña incorrectos. Intentá nuevamente." : (err as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="screen gradient-screen login-screen">
      <button className="login-back" onClick={() => navigate("home")}><Icon name="arrow" size={20} /> Volver</button>
      <form className="login-card" onSubmit={submit}>
        <div className="login-mark"><Icon name="plate" size={30} /></div>
        <span className="section-kicker">BIENVENIDO DE NUEVO</span>
        <h1>Ingresá a tu cuenta</h1>
        <p>Cargá tus hábitos de forma simple.</p>
        <label><span>Usuario</span><div className="input-wrap"><Icon name="user" size={19} /><input value={user} onChange={(e) => { setUser(e.target.value); setError(""); }} placeholder="Tu usuario" autoComplete="username" autoCapitalize="none" required /></div></label>
        <label><span>Contraseña</span><div className="input-wrap"><Icon name="lock" size={19} /><input type="password" value={password} onChange={(e) => { setPassword(e.target.value); setError(""); }} placeholder="••••" autoComplete="current-password" required /></div></label>
        <button className="primary-button" type="submit" disabled={busy}>{busy ? "Ingresando…" : "Ingresar"}</button>
        {error && <div className="error-message" role="alert">{error}</div>}
      </form>
    </main>
  );
}

function LoadMenu({ navigate }: { navigate: (screen: Screen) => void }) {
  return (
    <main className="screen content-screen">
      <Header title="Cargar datos" onBack={() => navigate("home")} />
      <div className="load-menu">
        <div className="load-intro"><span className="section-kicker">NUEVO REGISTRO</span><h1>¿Qué querés agregar?</h1><p>Elegí una opción para continuar.</p></div>
        <button className="option-card" onClick={() => navigate("add-food")}><span className="option-icon"><Icon name="camera" size={28} /></span><span><strong>Agregar foto de comida</strong><small>Guardá tu almuerzo o cena</small></span><Icon name="chevron" /></button>
        <button className="option-card peach" onClick={() => navigate("add-activity")}><span className="option-icon"><Icon name="shoe" size={28} /></span><span><strong>Agregar actividad física</strong><small>Registrá tu entrenamiento</small></span><Icon name="chevron" /></button>
      </div>
    </main>
  );
}

function SuccessOverlay({ message }: { message: string }) {
  return <div className="success-overlay"><div className="success-card"><span>✓</span><strong>¡Listo!</strong><p>{message}</p></div></div>;
}

function mealLabel(meal: Meal) {
  return meal.type === "Extra" && meal.note ? `Extra · ${meal.note}` : meal.type;
}

/** Sugiere el momento del día según la hora actual. */
function defaultMealType(): MealType {
  const hour = new Date().getHours();
  if (hour < 11) return "Desayuno";
  if (hour < 16) return "Almuerzo";
  if (hour < 20) return "Merienda";
  return "Cena";
}

function AddFood({
  navigate,
  credentials,
  onSaved,
}: {
  navigate: (screen: Screen) => void;
  credentials: Credentials;
  onSaved: () => Promise<void>;
}) {
  const [date, setDate] = useState(dateKey(new Date()));
  const [type, setType] = useState<MealType>(defaultMealType());
  const [note, setNote] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!file) {
      setError("Elegí o sacá una foto antes de guardar.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const image = await compressImage(file);
      await saveMeal(credentials, { date, type, image, note: type === "Extra" ? note.trim() : undefined });
      await onSaved();
      setSuccess(true);
      window.setTimeout(() => navigate("home"), 1200);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }
  return (
    <main className="screen content-screen">
      <Header title="Foto de comida" onBack={() => navigate("load")} />
      <form className="data-form scroll-content" onSubmit={submit}>
        <div className="form-intro"><span className="section-kicker">NUEVA COMIDA</span><h1>¿Qué comiste hoy?</h1></div>
        <label className="field"><span>Fecha</span><div className="input-wrap"><Icon name="calendar" size={19} /><input type="date" value={date} onChange={(e) => setDate(e.target.value)} required /></div></label>
        <fieldset><legend>Momento del día</legend><div className="toggle five">{MEAL_TYPES.map((option) => <button type="button" key={option} className={type === option ? "active" : ""} onClick={() => setType(option)}>{option}</button>)}</div></fieldset>
        {type === "Extra" && <label className="field"><span>¿Qué fue? (opcional)</span><div className="input-wrap"><Icon name="plate" size={19} /><input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ej. Postre, snack, fruta" maxLength={60} /></div></label>}
        <label className={`upload-area ${preview ? "has-image" : ""}`}>
          {preview ? <img src={preview} alt="Vista previa de la comida" /> : <><span><Icon name="camera" size={31} /></span><strong>Subí o tomá una foto</strong><small>JPG o PNG</small></>}
          <input type="file" accept="image/*" onChange={(e) => {
            const selectedFile = e.target.files?.[0];
            if (selectedFile) {
              setFile(selectedFile);
              setPreview(URL.createObjectURL(selectedFile));
              setError("");
            }
          }} />
        </label>
        {error && <div className="error-message" role="alert">{error}</div>}
        <button className="primary-button form-submit" type="submit" disabled={busy}>{busy ? "Subiendo foto…" : "Guardar comida"}</button>
      </form>
      {success && <SuccessOverlay message="Tu comida fue guardada." />}
    </main>
  );
}

function AddActivity({
  navigate,
  credentials,
  onSaved,
}: {
  navigate: (screen: Screen) => void;
  credentials: Credentials;
  onSaved: () => Promise<void>;
}) {
  const [date, setDate] = useState(dateKey(new Date()));
  const [name, setName] = useState("");
  const [duration, setDuration] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await saveActivity(credentials, { date, name: name.trim(), duration: Number(duration) });
      await onSaved();
      setSuccess(true);
      window.setTimeout(() => navigate("home"), 1200);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }
  return (
    <main className="screen content-screen">
      <Header title="Actividad física" onBack={() => navigate("load")} />
      <form className="data-form scroll-content" onSubmit={submit}>
        <div className="form-intro"><span className="section-kicker">NUEVA ACTIVIDAD</span><h1>Registrá tu movimiento</h1></div>
        <label className="field"><span>Fecha</span><div className="input-wrap"><Icon name="calendar" size={19} /><input type="date" value={date} onChange={(e) => setDate(e.target.value)} required /></div></label>
        <label className="field"><span>Actividad</span><div className="input-wrap"><Icon name="shoe" size={19} /><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. Running" maxLength={80} required /></div></label>
        <label className="field"><span>Duración (minutos)</span><div className="input-wrap"><Icon name="clock" size={19} /><input type="number" min="1" max="1440" step="1" inputMode="numeric" value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="Ej. 45" required /></div></label>
        <div className="form-tip"><Icon name="clock" size={21} /><span><strong>Un paso a la vez</strong><small>Cada minuto de movimiento suma a tu bienestar.</small></span></div>
        {error && <div className="error-message" role="alert">{error}</div>}
        <button className="primary-button form-submit" type="submit" disabled={busy}>{busy ? "Guardando…" : "Guardar actividad"}</button>
      </form>
      {success && <SuccessOverlay message="Tu actividad fue guardada." />}
    </main>
  );
}

const SESSION_KEY = "registro-credenciales";

function readSession(): Credentials | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as Credentials) : null;
  } catch {
    return null;
  }
}

function writeSession(credentials: Credentials) {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(credentials));
  } catch {
    /* sin almacenamiento: queda solo en memoria */
  }
}

export default function App() {
  const [screen, setScreen] = useState<Screen>("home");
  const [meals, setMeals] = useState<Meal[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loadError, setLoadError] = useState("");
  const [credentials, setCredentials] = useState<Credentials | null>(readSession);
  const [direction, setDirection] = useState("forward");

  const refresh = useCallback(async () => {
    try {
      const [nextMeals, nextActivities] = await Promise.all([fetchMeals(), fetchActivities()]);
      setMeals(nextMeals);
      setActivities(nextActivities);
      setLoadError("");
    } catch (err) {
      console.error(err);
      setLoadError("No se pudieron cargar los datos. Revisá tu conexión.");
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function removeMeal(meal: Meal) {
    if (!credentials || !window.confirm(`¿Borrar la foto de ${mealLabel(meal).toLowerCase()}? No se puede deshacer.`)) return false;
    try {
      await deleteMeal(credentials, meal.id);
      setMeals((current) => current.filter((item) => item.id !== meal.id));
      return true;
    } catch (err) {
      window.alert((err as Error).message);
      return false;
    }
  }

  async function removeActivity(activity: Activity) {
    if (!credentials || !window.confirm(`¿Borrar "${activity.name}" (${activity.duration} min)? No se puede deshacer.`)) return false;
    try {
      await deleteActivity(credentials, activity.id);
      setActivities((current) => current.filter((item) => item.id !== activity.id));
      return true;
    } catch (err) {
      window.alert((err as Error).message);
      return false;
    }
  }

  function navigate(next: Screen) {
    const backDestinations: Screen[] = ["home", "load"];
    setDirection(backDestinations.includes(next) ? "back" : "forward");
    if (next === "login" && credentials) next = "load";
    if ((next === "load" || next === "add-food" || next === "add-activity") && !credentials) next = "login";
    setScreen(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  let view: ReactNode;
  if (screen === "home") view = <Home navigate={navigate} />;
  else if (screen === "food") view = <FoodScreen meals={meals} navigate={navigate} onDelete={credentials ? removeMeal : undefined} />;
  else if (screen === "activity") view = <ActivityScreen activities={activities} navigate={navigate} onDelete={credentials ? removeActivity : undefined} />;
  else if (screen === "login" || !credentials) view = <Login navigate={navigate} onSuccess={(c) => { setCredentials(c); writeSession(c); setDirection("forward"); setScreen("load"); }} />;
  else if (screen === "load") view = <LoadMenu navigate={navigate} />;
  else if (screen === "add-food") view = <AddFood navigate={navigate} credentials={credentials} onSaved={refresh} />;
  else view = <AddActivity navigate={navigate} credentials={credentials} onSaved={refresh} />;

  return (
    <div className="app-shell" style={{ "--peach": COLORS.peach, "--coral": COLORS.coral, "--mauve": COLORS.mauve, "--violet": COLORS.violet, "--navy": COLORS.navy } as React.CSSProperties}>
      <div className={`phone-frame ${direction}`} key={screen}>
        {!isConfigured && <div className="config-banner">Falta configurar Supabase (VITE_SUPABASE_URL y VITE_SUPABASE_KEY).</div>}
        {loadError && <div className="config-banner" role="alert">{loadError} <button onClick={refresh}>Reintentar</button></div>}
        {view}
      </div>
    </div>
  );
}
