import { InlineKeyboard } from "grammy";

// ── Главное меню ──────────────────────────────────────────────────────────────
export const mainMenuKb = (isPremium = false) => {
  const lock = isPremium ? "" : " 🔒";
  return new InlineKeyboard()
    .text("📋 План питания",                    "nutrition").row()
    .text("🏋️ План тренировок",                "workout").row()
    .text("🔥 Калории и БЖУ",                   "calories").row()
    .text("✅ Отметить тренировку",              "track").row()
    .text("📊 Мой прогресс",                    "progress").row()
    .text(`📅 Мои дни тренировок${lock}`,        "setdays").row()
    .text(`🗓 Меню на неделю${lock}`,            "week_menu").row()
    .text(`🔔 Напоминания${lock}`,               "reminders").row()
    .text("⚙️ Параметры",                       "params");
};

export const genderKb = () =>
  new InlineKeyboard()
    .text("👨 Мужской",  "gender_male").row()
    .text("👩 Женский",  "gender_female");

export const goalKb = () =>
  new InlineKeyboard()
    .text("🔻 Похудение",   "goal_lose").row()
    .text("💪 Набор массы", "goal_gain").row()
    .text("🔥 Рельеф",      "goal_relief").row()
    .text("⚖️ Поддержание", "goal_maintain");

export const levelKb = () =>
  new InlineKeyboard()
    .text("🌱 Новичок",     "level_beginner").row()
    .text("💡 Средний",     "level_intermediate").row()
    .text("🚀 Продвинутый", "level_advanced");

export const activityKb = () =>
  new InlineKeyboard()
    .text("🪑 Сидячий",        "activity_sedentary").row()
    .text("🚶 Лёгкий",         "activity_light").row()
    .text("🏃 Умеренный",      "activity_moderate").row()
    .text("💪 Активный",       "activity_active").row()
    .text("🔥 Очень активный", "activity_very_active");

export const backKb = () =>
  new InlineKeyboard().text("🏠 Главное меню", "menu");

// Мини-экран продажи
export const premiumBackKb = () =>
  new InlineKeyboard()
    .text("⭐ Купить Премиум — 149 ₽/мес", "buy_premium").row()
    .text("← Назад в меню",                "menu");

// Дни тренировочного плана — принимает dayMap: {"Понедельник": 0, "Среда": 1, ...}
// Первые 3 открыты для бесплатных, остальные с замком
export const workoutDaysKb = (dayMap, isPremium = false) => {
  const kb      = new InlineKeyboard();
  const entries = Object.entries(dayMap);
  entries.forEach(([dayName, trainIndex]) => {
    if (trainIndex < 3 || isPremium) {
      kb.text(`📅 ${dayName}`, `day_${dayName}`).row();
    } else {
      kb.text(`📅 ${dayName} 🔒`, "workout_locked").row();
    }
  });
  if (!isPremium && entries.some(([, i]) => i >= 3)) {
    kb.text("⭐ Открыть все тренировки", "workout_upsell").row();
  }
  kb.text("🏠 Главное меню", "menu");
  return kb;
};

// Выбор недели (1-4), текущая подсвечена галочкой
export const weekSelectKb = (currentWeek) =>
  new InlineKeyboard()
    .text(currentWeek === 1 ? "✅ Неделя 1" : "Неделя 1", "week_select_1")
    .text(currentWeek === 2 ? "✅ Неделя 2" : "Неделя 2", "week_select_2")
    .row()
    .text(currentWeek === 3 ? "✅ Неделя 3" : "Неделя 3", "week_select_3")
    .text(currentWeek === 4 ? "✅ Неделя 4" : "Неделя 4", "week_select_4")
    .row()
    .text("🏠 Главное меню", "menu");

// Выбор дня внутри недели
const WEEK_DAYS      = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
const WEEK_DAYS_FULL = {
  "Пн": "Понедельник", "Вт": "Вторник",  "Ср": "Среда",
  "Чт": "Четверг",     "Пт": "Пятница",  "Сб": "Суббота", "Вс": "Воскресенье",
};

export const weekDaysKb = (weekNumber, availableDays) => {
  const kb = new InlineKeyboard();
  WEEK_DAYS.forEach((short, i) => {
    const full   = WEEK_DAYS_FULL[short];
    const hasDay = availableDays.includes(full);
    const label  = hasDay ? `📅 ${short}` : short;
    kb.text(label, `week_day_${weekNumber}_${full}`);
    if (i === 3) kb.row();
  });
  kb.row()
    .text("← Назад к неделям", "week_menu")
    .row()
    .text("🏠 Главное меню", "menu");
  return kb;
};

export { WEEK_DAYS_FULL };

// Экран прогресса
export const progressKb = (isPremium = false) => {
  const kb = new InlineKeyboard();
  kb.text("⚖️ Записать вес", "log_weight").row();
  if (!isPremium) {
    kb.text("⭐ Детальная статистика", "progress_upsell").row();
  }
  kb.text("🏠 Главное меню", "menu");
  return kb;
};

// Выбор дней тренировок (Премиум, тоглы)
const ALL_DAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

export const selectWorkoutDaysKb = (selected = []) => {
  const kb = new InlineKeyboard();
  ALL_DAYS.forEach((day, i) => {
    const isOn = selected.includes(day);
    kb.text(isOn ? `✅ ${day}` : day, `wday_toggle_${day}`);
    if (i === 3) kb.row();
  });
  kb.row();
  kb.text("💾 Сохранить", "wday_save");
  kb.text("◀️ Назад",     "menu");
  return kb;
};

// Меню редактирования параметров профиля
export const paramsMenuKb = () =>
  new InlineKeyboard()
    .text("👤 Пол",          "edit_gender").row()
    .text("🎂 Возраст",      "edit_age").row()
    .text("⚖️ Вес",          "edit_weight").row()
    .text("📏 Рост",         "edit_height").row()
    .text("🎯 Цель",         "edit_goal").row()
    .text("💡 Уровень",      "edit_level").row()
    .text("🏃 Активность",   "edit_activity").row()
    .text("🏠 Главное меню", "menu");
