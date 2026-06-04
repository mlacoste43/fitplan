import { backKb, mainMenuKb, premiumBackKb, weekMenuKb, workoutDaysKb } from "../keyboards/kb.js";
import { getUser, logWorkout, getStreak } from "../database/db.js";
import {
  calculateCalories,
  getNutritionPlan,
  getWorkoutPlan,
  GOAL_LABELS,
  LEVEL_LABELS,
  GENDER_LABELS,
  DAYS_RU,
} from "../plans/data.js";
import { getWeeklyNutritionDay, getFullWeekNutrition, getWeekNumber } from "../plans/weekly.js";

const NO_PROFILE = "Сначала создай профиль — нажми /start";

// ── Мини-экраны продаж ────────────────────────────────────────────────────────
const PREMIUM_SCREENS = {
  track:
    "✅ Трекер тренировок — Премиум\n\n" +
    "Отмечай каждую тренировку и следи за своей серией:\n" +
    "• Серия дней без пропусков 🔥\n" +
    "• Мотивация не бросать на полпути\n" +
    "• Статистика активности\n\n" +
    "💰 Премиум: 149 ₽/мес\nВключает трекер, дни тренировок, напоминания и недельное меню",

  setdays:
    "📅 Мои дни тренировок — Премиум\n\n" +
    "Выбери дни когда тренируешься — и бот подстроится под тебя:\n" +
    "• Напоминания только в твои дни\n" +
    "• Никакого спама в дни отдыха\n" +
    "• Можно менять когда угодно\n\n" +
    "💰 Премиум: 149 ₽/мес\nВключает трекер, дни тренировок, напоминания и недельное меню",

  week_menu:
    "🗓 Меню на неделю — Премиум\n\n" +
    "Получай готовое меню питания на 7 дней вперёд:\n" +
    "• Завтрак, обед, ужин и перекусы\n" +
    "• Меню подобрано под твою цель\n" +
    "• Обновляется каждую неделю\n\n" +
    "💰 Премиум: 149 ₽/мес\nВключает трекер, дни тренировок, напоминания и недельное меню",

  reminders:
    "🔔 Напоминания — Премиум\n\n" +
    "Бот будет писать тебе сам:\n" +
    "• Утром — план питания на день\n" +
    "• За час до тренировки — план упражнений\n" +
    "• Вечером — итог дня и мотивация\n\n" +
    "💰 Премиум: 149 ₽/мес\nВключает трекер, дни тренировок, напоминания и недельное меню",
};

async function showPremiumScreen(ctx, feature) {
  const text = PREMIUM_SCREENS[feature];
  if (ctx.callbackQuery) {
    await ctx.editMessageText(text, { reply_markup: premiumBackKb() });
  } else {
    await ctx.reply(text, { reply_markup: premiumBackKb() });
  }
}

// ── Меню ──────────────────────────────────────────────────────────────────────
export async function handleMenu(ctx) {
  const user = await getUser(ctx.from.id);
  await ctx.editMessageText("🏠 Главное меню:", { reply_markup: mainMenuKb(user?.is_premium) });
}

export async function handleMenuCommand(ctx) {
  const user = await getUser(ctx.from.id);
  if (!user) { await ctx.reply(NO_PROFILE); return; }
  await ctx.reply("🏠 Главное меню:", { reply_markup: mainMenuKb(user.is_premium) });
}

// ── План питания ──────────────────────────────────────────────────────────────
export async function handleNutrition(ctx) {
  const user = await getUser(ctx.from.id);
  if (!user) { await ctx.editMessageText(NO_PROFILE, { reply_markup: backKb() }); return; }
  const plan = getNutritionPlan(user.goal, user.level);
  await ctx.editMessageText(plan, { reply_markup: backKb() });
}

export async function handlePlanCommand(ctx) {
  const user = await getUser(ctx.from.id);
  if (!user) { await ctx.reply(NO_PROFILE); return; }
  const plan = getNutritionPlan(user.goal, user.level);
  await ctx.reply(plan, { reply_markup: backKb() });
}

// ── План тренировок ───────────────────────────────────────────────────────────
export async function handleWorkout(ctx) {
  const user = await getUser(ctx.from.id);
  if (!user) { await ctx.editMessageText(NO_PROFILE, { reply_markup: backKb() }); return; }

  const plan = getWorkoutPlan(user.goal, user.level);
  if (!plan) { await ctx.editMessageText("План не найден.", { reply_markup: backKb() }); return; }

  await ctx.editMessageText(
    `Цель: ${GOAL_LABELS[user.goal]} | Уровень: ${LEVEL_LABELS[user.level]}\n\n` +
    `Расписание: ${plan.schedule}\n\nВыбери день чтобы посмотреть подробности:`,
    { reply_markup: workoutDaysKb(plan.days) }
  );
}

export async function handleWorkoutCommand(ctx) {
  const user = await getUser(ctx.from.id);
  if (!user) { await ctx.reply(NO_PROFILE); return; }

  const plan = getWorkoutPlan(user.goal, user.level);
  if (!plan) { await ctx.reply("План не найден."); return; }

  await ctx.reply(
    `Цель: ${GOAL_LABELS[user.goal]} | Уровень: ${LEVEL_LABELS[user.level]}\n\n` +
    `Расписание: ${plan.schedule}\n\nВыбери день:`,
    { reply_markup: workoutDaysKb(plan.days) }
  );
}

// ── Конкретный день тренировки ────────────────────────────────────────────────
export async function handleWorkoutDay(ctx) {
  const day  = ctx.callbackQuery.data.replace("day_", "");
  const user = await getUser(ctx.from.id);
  if (!user) { await ctx.editMessageText(NO_PROFILE, { reply_markup: backKb() }); return; }

  const plan   = getWorkoutPlan(user.goal, user.level);
  const detail = plan?.days?.[day] || "День не найден";
  await ctx.editMessageText(`${day}\n\n${detail}`, { reply_markup: backKb() });
}

// ── Калории и БЖУ ─────────────────────────────────────────────────────────────
export async function handleCalories(ctx) {
  const user = await getUser(ctx.from.id);
  if (!user) { await ctx.editMessageText(NO_PROFILE, { reply_markup: backKb() }); return; }
  await ctx.editMessageText(_caloriesText(user), { reply_markup: backKb() });
}

export async function handleCaloriesCommand(ctx) {
  const user = await getUser(ctx.from.id);
  if (!user) { await ctx.reply(NO_PROFILE); return; }
  await ctx.reply(_caloriesText(user), { reply_markup: backKb() });
}

function _caloriesText(user) {
  const k = calculateCalories({
    gender: user.gender,
    age:    user.age,
    weight: parseFloat(user.weight),
    height: parseFloat(user.height),
    goal:   user.goal,
  });
  return (
    `Твоя норма КБЖУ\n\n` +
    `Пол: ${GENDER_LABELS[user.gender]}, возраст: ${user.age} лет\n` +
    `Вес: ${user.weight} кг | Рост: ${user.height} см\n` +
    `Цель: ${GOAL_LABELS[user.goal]}\n\n` +
    `Калории:  ${k.calories} ккал\n` +
    `Белки:    ${k.protein} г\n` +
    `Жиры:     ${k.fat} г\n` +
    `Углеводы: ${k.carbs} г\n\n` +
    `Распредели приёмы пищи на 4-5 раз в день.`
  );
}

// ── Трекер тренировок (Премиум) ───────────────────────────────────────────────
export async function handleTrack(ctx) {
  const user = await getUser(ctx.from.id);
  if (!user) { await ctx.editMessageText(NO_PROFILE, { reply_markup: backKb() }); return; }
  if (!user.is_premium) { await showPremiumScreen(ctx, "track"); return; }

  await logWorkout(ctx.from.id);
  const streak = await getStreak(ctx.from.id);
  const fire   = "🔥".repeat(Math.min(streak, 10));

  await ctx.editMessageText(
    `Тренировка засчитана!\n\nТвоя серия: ${streak} дн. ${fire}\n\nТак держать! Возвращайся завтра 💪`,
    { reply_markup: backKb() }
  );
}

export async function handleTrackCommand(ctx) {
  const user = await getUser(ctx.from.id);
  if (!user) { await ctx.reply(NO_PROFILE); return; }
  if (!user.is_premium) { await showPremiumScreen(ctx, "track"); return; }

  await logWorkout(ctx.from.id);
  const streak = await getStreak(ctx.from.id);
  const fire   = "🔥".repeat(Math.min(streak, 10));

  await ctx.reply(
    `Тренировка засчитана!\n\nТвоя серия: ${streak} дн. ${fire}\n\nТак держать! 💪`,
    { reply_markup: backKb() }
  );
}

// ── Напоминания (Премиум) ─────────────────────────────────────────────────────
export async function handleReminders(ctx) {
  const user = await getUser(ctx.from.id);
  if (!user) { await ctx.editMessageText(NO_PROFILE, { reply_markup: backKb() }); return; }
  if (!user.is_premium) { await showPremiumScreen(ctx, "reminders"); return; }

  await ctx.editMessageText(
    "🔔 Напоминания включены!\n\nТы будешь получать уведомления утром, перед тренировкой и вечером.",
    { reply_markup: backKb() }
  );
}

// ── /today ────────────────────────────────────────────────────────────────────
export async function handleTodayCommand(ctx) {
  const user = await getUser(ctx.from.id);
  if (!user) { await ctx.reply(NO_PROFILE); return; }

  const dayIndex  = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;
  const todayName = DAYS_RU[dayIndex];
  const plan      = getWorkoutPlan(user.goal, user.level);

  if (plan?.days?.[todayName]) {
    await ctx.reply(`Сегодня — ${todayName}\n\n${plan.days[todayName]}`, { reply_markup: backKb() });
  } else {
    await ctx.reply(`Сегодня — ${todayName}\n\nДень отдыха! Восстанавливайся и питайся правильно.`, { reply_markup: backKb() });
  }
}

// ── Купить Премиум ────────────────────────────────────────────────────────────
export async function handlePremium(ctx) {
  const text =
    "⭐ Премиум — ФитПлан\n\n" +
    "Что входит в подписку:\n" +
    "• ✅ Трекер тренировок и серии дней\n" +
    "• 📅 Выбор твоих дней тренировок\n" +
    "• 🗓 Меню питания на неделю вперёд\n" +
    "• 🔔 Напоминания под твоё расписание\n\n" +
    "💰 149 ₽/мес\n\n" +
    "Для оплаты напиши администратору: @admin";

  if (ctx.callbackQuery) {
    await ctx.editMessageText(text, { reply_markup: backKb() });
  } else {
    await ctx.reply(text, { reply_markup: backKb() });
  }
}

// ── Недельное меню (Премиум) ──────────────────────────────────────────────────
export async function handleWeekMenu(ctx) {
  const user = await getUser(ctx.from.id);
  if (!user) { await ctx.editMessageText(NO_PROFILE, { reply_markup: backKb() }); return; }
  if (!user.is_premium) { await showPremiumScreen(ctx, "week_menu"); return; }

  await ctx.editMessageText(
    `Неделя ${getWeekNumber()} — выбери что показать:`,
    { reply_markup: weekMenuKb() }
  );
}

export async function handleWeekToday(ctx) {
  const user = await getUser(ctx.from.id);
  if (!user) { await ctx.editMessageText(NO_PROFILE, { reply_markup: backKb() }); return; }

  const DAYS = ["Воскресенье","Понедельник","Вторник","Среда","Четверг","Пятница","Суббота"];
  const todayName = DAYS[new Date().getDay()];
  const menu = getWeeklyNutritionDay(user.goal, todayName);

  await ctx.editMessageText(
    `Питание на сегодня (${todayName}):\n\n${menu}`,
    { reply_markup: backKb() }
  );
}

export async function handleWeekFull(ctx) {
  const user = await getUser(ctx.from.id);
  if (!user) { await ctx.editMessageText(NO_PROFILE, { reply_markup: backKb() }); return; }

  const week = getFullWeekNutrition(user.goal);
  if (!week) { await ctx.editMessageText("План не найден.", { reply_markup: backKb() }); return; }

  const DAYS = ["Понедельник","Вторник","Среда","Четверг","Пятница","Суббота","Воскресенье"];
  let text = `Меню на неделю ${getWeekNumber()}:\n\n`;
  for (const day of DAYS) {
    if (week[day]) text += `${day}:\n${week[day]}\n\n`;
  }

  await ctx.editMessageText(text.slice(0, 4000), { reply_markup: backKb() });
}