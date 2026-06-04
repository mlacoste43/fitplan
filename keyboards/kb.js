import { InlineKeyboard } from "grammy";

// Главное меню — замки на премиум-функциях
export const mainMenuKb = (isPremium = false) => {
  const lock = isPremium ? "" : " 🔒";
  return new InlineKeyboard()
    .text("📋 План питания",              "nutrition").row()
    .text("🏋️ План тренировок",          "workout").row()
    .text("🔥 Калории и БЖУ",             "calories").row()
    .text(`✅ Отметить тренировку${lock}`, "track").row()
    .text(`📅 Мои дни тренировок${lock}`,  "setdays").row()
    .text(`🗓 Меню на неделю${lock}`,      "week_menu").row()
    .text(`🔔 Напоминания${lock}`,         "reminders").row()
    .text("⚙️ Изменить параметры",        "params");
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

export const backKb = () =>
  new InlineKeyboard().text("🏠 Главное меню", "menu");

// Клавиатура мини-экрана продажи: купить + назад
export const premiumBackKb = () =>
  new InlineKeyboard()
    .text("⭐ Купить Премиум", "buy_premium").row()
    .text("← Назад",          "menu");

// Кнопки дней тренировочного плана (просмотр)
export const workoutDaysKb = (days) => {
  const kb = new InlineKeyboard();
  for (const day of Object.keys(days)) {
    kb.text(`📅 ${day}`, `day_${day}`).row();
  }
  kb.text("🏠 Главное меню", "menu");
  return kb;
};

export const weekMenuKb = () =>
  new InlineKeyboard()
    .text("📅 Меню на сегодня",    "week_today").row()
    .text("📋 Меню на всю неделю", "week_full").row()
    .text("🏠 Главное меню",       "menu");

// Выбор дней тренировок (Премиум, тоглы)
const ALL_DAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

// Меню изменения параметров профиля
export const paramsMenuKb = () =>
  new InlineKeyboard()
    .text("👤 Пол",          "edit_gender").row()
    .text("🎂 Возраст",      "edit_age").row()
    .text("⚖️ Вес",          "edit_weight").row()
    .text("📏 Рост",         "edit_height").row()
    .text("🎯 Цель",         "edit_goal").row()
    .text("💡 Уровень",      "edit_level").row()
    .text("🏠 Главное меню", "menu");

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