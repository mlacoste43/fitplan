import { InlineKeyboard } from "grammy";

export const mainMenuKb = () =>
  new InlineKeyboard()
    .text("📋 План питания",      "nutrition").row()
    .text("🏋️ План тренировок",  "workout").row()
    .text("🔥 Калории и БЖУ",    "calories").row()
    .text("✅ Отметить тренировку","track").row()
    .text("⚙️ Изменить параметры","restart").row()
    .text("🗓 Меню на неделю",     "week_menu").row()
    .text("⭐ Премиум",           "premium");

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
