import pg from "pg";
const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// ── Инициализация таблиц ──────────────────────────────────────────────────────
export async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      telegram_id  BIGINT PRIMARY KEY,
      username     TEXT,
      gender       TEXT,
      age          INTEGER,
      weight       NUMERIC,
      height       NUMERIC,
      goal         TEXT,
      level        TEXT,
      is_premium   BOOLEAN DEFAULT FALSE,
      created_at   TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS tracking (
      id            SERIAL PRIMARY KEY,
      telegram_id   BIGINT REFERENCES users(telegram_id),
      date          DATE DEFAULT CURRENT_DATE,
      workout_done  BOOLEAN DEFAULT FALSE,
      UNIQUE(telegram_id, date)
    );
  `);
  console.log("✅ БД инициализирована");
}

// ── Пользователи ──────────────────────────────────────────────────────────────
export async function saveUser({ telegramId, username, gender, age, weight, height, goal, level }) {
  await pool.query(
    `INSERT INTO users (telegram_id, username, gender, age, weight, height, goal, level)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     ON CONFLICT (telegram_id) DO UPDATE
     SET username=$2, gender=$3, age=$4, weight=$5, height=$6, goal=$7, level=$8`,
    [telegramId, username, gender, age, weight, height, goal, level]
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

// ── Трекинг тренировок ────────────────────────────────────────────────────────
export async function logWorkout(telegramId) {
  await pool.query(
    `INSERT INTO tracking (telegram_id, date, workout_done)
     VALUES ($1, CURRENT_DATE, TRUE)
     ON CONFLICT (telegram_id, date) DO UPDATE SET workout_done = TRUE`,
    [telegramId]
  );
}

export async function getStreak(telegramId) {
  const { rows } = await pool.query(
    `SELECT date FROM tracking
     WHERE telegram_id = $1 AND workout_done = TRUE
     ORDER BY date DESC`,
    [telegramId]
  );
  if (!rows.length) return 0;

  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < rows.length; i++) {
    const expected = new Date(today);
    expected.setDate(today.getDate() - i);
    const rowDate = new Date(rows[i].date);
    rowDate.setHours(0, 0, 0, 0);
    if (rowDate.getTime() === expected.getTime()) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}
