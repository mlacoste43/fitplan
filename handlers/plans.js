import { backKb, mainMenuKb, workoutDaysKb } from "../keyboards/kb.js";
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

const NO_PROFILE = "Сначала создай профиль — нажми /start";

// ── Меню ──────────────────────────────────────────────────────────────────────
export async function handleMenu(ctx) {
  await ctx.editMessageText("🏠 Главное меню:", { reply_markup: mainMenuKb() });
}

export async function handleMenuCommand(ctx) {
  const user = await getUser(ctx.from.id);
  if (!user) { await ctx.reply(NO_PROFILE); return; }
  await ctx.reply("🏠 Главное меню:", { reply_markup: mainMenuKb() });
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

  const text =
    `Цель: ${GOAL_LABELS[user.goal]} | Уровень: ${LEVEL_LABELS[user.level]}\n\n` +
    `Расписание: ${plan.schedule}\n\n` +
    `Выбери день чтобы посмотреть подробности:`;

  await ctx.editMessageText(text, { reply_markup: workoutDaysKb(plan.days) });
}

export async function handleWorkoutCommand(ctx) {
  const user = await getUser(ctx.from.id);
  if (!user) { await ctx.reply(NO_PROFILE); return; }

  const plan = getWorkoutPlan(user.goal, user.level);
  if (!plan) { await ctx.reply("План не найден."); return; }

  const text =
    `Цель: ${GOAL_LABELS[user.goal]} | Уровень: ${LEVEL_LABELS[user.level]}\n\n` +
    `Расписание: ${plan.schedule}\n\nВыбери день:`;

  await ctx.reply(text, { reply_markup: workoutDaysKb(plan.days) });
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

// ── Трекер тренировок ─────────────────────────────────────────────────────────
export async function handleTrack(ctx) {
  const user = await getUser(ctx.from.id);
  if (!user) { await ctx.editMessageText(NO_PROFILE, { reply_markup: backKb() }); return; }

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

  await logWorkout(ctx.from.id);
  const streak = await getStreak(ctx.from.id);
  const fire   = "🔥".repeat(Math.min(streak, 10));

  await ctx.reply(
    `Тренировка засчитана!\n\nТвоя серия: ${streak} дн. ${fire}\n\nТак держать! 💪`,
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

// ── Премиум ───────────────────────────────────────────────────────────────────
export async function handlePremium(ctx) {
  const text =
    "Премиум — ФитПлан\n\n" +
    "Бесплатно:\n• 1 план питания\n• Базовый калькулятор КБЖУ\n\n" +
    "Стандарт — 149 руб/мес:\n• Смена плана в любое время\n• Трекер тренировок и серии\n• Ежедневные напоминания\n\n" +
    "Про — 299 руб/мес:\n• Всё из Стандарт\n• Корректировка плана по прогрессу\n• Приоритетная поддержка\n\n" +
    "Для оплаты напиши администратору бота.";

  if (ctx.callbackQuery) {
    await ctx.editMessageText(text, { reply_markup: backKb() });
  } else {
    await ctx.reply(text, { reply_markup: backKb() });
  }
}

// ── Недельное меню (только для премиум) ───────────────────────────────────────
import { getWeeklyNutritionDay, getFullWeekNutrition, getWeekNumber } from "../plans/weekly.js";
import { weekMenuKb } from "../keyboards/kb.js";

export async function handleWeekMenu(ctx) {
  const user = await getUser(ctx.from.id);
  if (!user) { await ctx.editMessageText(NO_PROFILE, { reply_markup: backKb() }); return; }

  if (!user.is_premium) {
    await ctx.editMessageText(
      "Недельное меню доступно только для премиум подписчиков.\n\nНажми /premium чтобы узнать подробности.",
      { reply_markup: backKb() }
    );
    return;
  }

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
