import pg from "pg";
const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false,
});

// ── Инициализация таблиц ──────────────────────────────────────────────────────
export async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      telegram_id   BIGINT PRIMARY KEY,
      username      TEXT,
      gender        TEXT,
      age           INTEGER,
      weight        NUMERIC,
      height        NUMERIC,
      goal          TEXT,
      level         TEXT,
      activity      TEXT DEFAULT 'moderate',
      is_premium         BOOLEAN DEFAULT FALSE,
      workout_days       TEXT[] DEFAULT NULL,
      reminders_enabled  BOOLEAN DEFAULT TRUE,
      created_at         TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS tracking (
      id            SERIAL PRIMARY KEY,
      telegram_id   BIGINT REFERENCES users(telegram_id),
      date          DATE DEFAULT CURRENT_DATE,
      workout_done  BOOLEAN DEFAULT FALSE,
      UNIQUE(telegram_id, date)
    );

    CREATE TABLE IF NOT EXISTS weight_log (
      id            SERIAL PRIMARY KEY,
      telegram_id   BIGINT REFERENCES users(telegram_id),
      weight        NUMERIC NOT NULL,
      date          DATE DEFAULT CURRENT_DATE,
      UNIQUE(telegram_id, date)
    );
  `);

  // Миграции для существующих БД
  await pool.query(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS workout_days TEXT[] DEFAULT NULL;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS activity TEXT DEFAULT 'moderate';
    ALTER TABLE users ADD COLUMN IF NOT EXISTS reminders_enabled BOOLEAN DEFAULT TRUE;
  `);

  console.log("✅ БД инициализирована");
}

// ── Пользователи ──────────────────────────────────────────────────────────────
export async function saveUser({ telegramId, username, gender, age, weight, height, goal, level, activity = "moderate" }) {
  await pool.query(
    `INSERT INTO users (telegram_id, username, gender, age, weight, height, goal, level, activity)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     ON CONFLICT (telegram_id) DO UPDATE
     SET username=$2, gender=$3, age=$4, weight=$5, height=$6, goal=$7, level=$8, activity=$9`,
    [telegramId, username, gender, age, weight, height, goal, level, activity]
  );
}

export async function getUser(telegramId) {
  const { rows } = await pool.query(
    "SELECT * FROM users WHERE telegram_id = $1",
    [telegramId]
  );
  return rows[0] || null;
}

export async function getAllUsers() {
  const { rows } = await pool.query("SELECT telegram_id FROM users");
  return rows;
}

// ── Дни тренировок ────────────────────────────────────────────────────────────
export async function saveWorkoutDays(telegramId, days) {
  await pool.query(
    `UPDATE users SET workout_days = $1 WHERE telegram_id = $2`,
    [days, telegramId]
  );
}

export async function getWorkoutDays(telegramId) {
  const { rows } = await pool.query(
    "SELECT workout_days FROM users WHERE telegram_id = $1",
    [telegramId]
  );
  return rows[0]?.workout_days || null;
}

// ── Напоминания ───────────────────────────────────────────────────────────────
export async function toggleReminders(telegramId, enabled) {
  await pool.query(
    `UPDATE users SET reminders_enabled = $1 WHERE telegram_id = $2`,
    [enabled, telegramId]
  );
}

// ── Трекинг тренировок ────────────────────────────────────────────────────────
export async function logWorkout(telegramId) {
  await pool.query(
    `INSERT INTO tracking (telegram_id, date, workout_done)
     VALUES ($1, CURRENT_DATE, TRUE)
     ON CONFLICT (telegram_id, date) DO UPDATE SET workout_done = TRUE`,
    [telegramId]
  );
}

// Текущая серия — умная, учитывает расписание пользователя
export async function getStreak(telegramId) {
  const [trackRes, userRes] = await Promise.all([
    pool.query(
      `SELECT date FROM tracking WHERE telegram_id = $1 AND workout_done = TRUE ORDER BY date DESC`,
      [telegramId]
    ),
    pool.query(
      `SELECT workout_days FROM users WHERE telegram_id = $1`,
      [telegramId]
    ),
  ]);

  if (!trackRes.rows.length) return 0;

  const workoutDays = userRes.rows[0]?.workout_days;
  const DAY_SHORT   = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
  const doneDates   = new Set(trackRes.rows.map(r => new Date(r.date).toDateString()));

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let streak = 0;

  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);

    if (workoutDays?.length) {
      const shortName = DAY_SHORT[d.getDay()];
      if (!workoutDays.includes(shortName)) continue; // не плановый день — пропускаем
    }

    if (doneDates.has(d.toDateString())) {
      streak++;
    } else {
      if (i === 0) continue; // сегодня ещё не отмечено — не штрафуем
      break;
    }
  }

  return streak;
}

// Рекорд серии за всё время
export async function getBestStreak(telegramId) {
  const [trackRes, userRes] = await Promise.all([
    pool.query(
      `SELECT date FROM tracking WHERE telegram_id = $1 AND workout_done = TRUE ORDER BY date ASC`,
      [telegramId]
    ),
    pool.query(
      `SELECT workout_days FROM users WHERE telegram_id = $1`,
      [telegramId]
    ),
  ]);

  if (!trackRes.rows.length) return 0;

  const workoutDays = userRes.rows[0]?.workout_days;
  const DAY_SHORT   = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
  const doneDates   = new Set(trackRes.rows.map(r => new Date(r.date).toDateString()));

  // Строим список всех плановых дней с начала первой тренировки до сегодня
  const firstDate = new Date(trackRes.rows[0].date);
  firstDate.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let best    = 0;
  let current = 0;

  for (let d = new Date(firstDate); d <= today; d.setDate(d.getDate() + 1)) {
    if (workoutDays?.length) {
      const shortName = DAY_SHORT[d.getDay()];
      if (!workoutDays.includes(shortName)) continue;
    }

    if (doneDates.has(d.toDateString())) {
      current++;
      if (current > best) best = current;
    } else {
      // Сегодняшний незакрытый день не обрывает рекорд
      if (d.toDateString() === today.toDateString()) break;
      current = 0;
    }
  }

  return best;
}

// Статистика за последние N недель (для графика активности)
export async function getWeeklyStats(telegramId, weeksCount = 4) {
  const { rows } = await pool.query(
    `SELECT date FROM tracking
     WHERE telegram_id = $1 AND workout_done = TRUE
       AND date >= CURRENT_DATE - INTERVAL '${weeksCount * 7} days'
     ORDER BY date DESC`,
    [telegramId]
  );

  const doneDates = new Set(rows.map(r => new Date(r.date).toDateString()));

  // Получаем дни тренировок пользователя
  const userRes = await pool.query(
    `SELECT workout_days FROM users WHERE telegram_id = $1`,
    [telegramId]
  );
  const workoutDays = userRes.rows[0]?.workout_days;
  const DAY_SHORT   = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];

  const weeks = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let w = 0; w < weeksCount; w++) {
    let planned = 0;
    let done    = 0;

    for (let d = 0; d < 7; d++) {
      const day = new Date(today);
      day.setDate(today.getDate() - w * 7 - d);

      // Будущие дни не считаем
      if (day > today) continue;

      if (workoutDays?.length) {
        const shortName = DAY_SHORT[day.getDay()];
        if (!workoutDays.includes(shortName)) continue;
      } else {
        // Без расписания считаем все дни где была тренировка
        if (doneDates.has(day.toDateString())) done++;
        planned++;
        continue;
      }

      planned++;
      if (doneDates.has(day.toDateString())) done++;
    }

    weeks.push({ week: w, planned, done });
  }

  return weeks; // [{ week: 0 (эта), planned: 5, done: 4 }, ...]
}

// Статистика за текущий месяц
export async function getMonthStats(telegramId) {
  const { rows } = await pool.query(
    `SELECT COUNT(*) as count FROM tracking
     WHERE telegram_id = $1 AND workout_done = TRUE
       AND date >= DATE_TRUNC('month', CURRENT_DATE)`,
    [telegramId]
  );
  return parseInt(rows[0].count);
}

// ── Вес ───────────────────────────────────────────────────────────────────────
export async function logWeight(telegramId, weight) {
  await pool.query(
    `INSERT INTO weight_log (telegram_id, weight, date)
     VALUES ($1, $2, CURRENT_DATE)
     ON CONFLICT (telegram_id, date) DO UPDATE SET weight = $2`,
    [telegramId, weight]
  );
  // Обновляем текущий вес в профиле
  await pool.query(
    `UPDATE users SET weight = $1 WHERE telegram_id = $2`,
    [weight, telegramId]
  );
}

export async function getWeightHistory(telegramId, limit = 8) {
  const { rows } = await pool.query(
    `SELECT weight, date FROM weight_log
     WHERE telegram_id = $1
     ORDER BY date ASC
     LIMIT $2`,
    [telegramId, limit]
  );
  return rows;
}
