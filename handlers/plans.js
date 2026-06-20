import { backKb, mainMenuKb, premiumBackKb, weekSelectKb, weekDaysKb, workoutDaysKb, progressKb } from "../keyboards/kb.js";
import {
  getUser, logWorkout, getStreak, getBestStreak,
  getWeeklyStats, getMonthStats, getWeightHistory, logWeight,
} from "../database/db.js";
import {
  calculateCalories,
  getNutritionPlan,
  getWorkoutPlan,
  GOAL_LABELS,
  LEVEL_LABELS,
  GENDER_LABELS,
  ACTIVITY_LABELS,
  DAYS_RU,
} from "../plans/data.js";
import { getWeeklyNutritionDay, getWeekNutrition, getWeekNumber } from "../plans/weekly.js";
import { getSession, setStep, setData, clearSession, STEPS } from "../utils/session.js";
import { getWorkoutDays, toggleReminders } from "../database/db.js";

const NO_PROFILE = "Сначала создай профиль — нажми /start";

// ── Мини-экраны продаж ────────────────────────────────────────────────────────
const PREMIUM_SCREENS = {
  setdays:
    "📅 Мои дни тренировок — Премиум\n\n" +
    "Укажи когда реально тренируешься:\n" +
    "• Напоминания только в твои дни\n" +
    "• Трекер учитывает только плановые дни\n" +
    "• Никакого спама в дни отдыха\n\n" +
    "💰 Премиум: 149 ₽/мес",

  week_menu:
    "🗓 Меню на неделю — Премиум\n\n" +
    "Перестань думать что есть каждый день:\n" +
    "• Готовое меню на 7 дней вперёд\n" +
    "• Завтрак, обед, ужин, перекусы\n" +
    "• Подобрано под твою цель\n\n" +
    "💰 Премиум: 149 ₽/мес",

  reminders:
    "🔔 Напоминания — Премиум\n\n" +
    "Бот сам напомнит — тебе не нужно помнить:\n" +
    "• Утром — план питания на день\n" +
    "• Перед тренировкой — программа упражнений\n" +
    "• Только в твои тренировочные дни\n\n" +
    "💰 Премиум: 149 ₽/мес",

  workout_days:
    "🏋️ Все дни тренировок — Премиум\n\n" +
    "Бесплатно доступны первые 3 тренировки.\n" +
    "С Премиумом открывается полная неделя:\n" +
    "• Все тренировочные дни без ограничений\n" +
    "• Выбери свои дни — бот подстроится\n" +
    "• Напоминания под твоё расписание 🔔\n\n" +
    "💰 Премиум: 149 ₽/мес",

  progress_upsell:
    "📊 Детальная статистика — Премиум\n\n" +
    "С Премиумом открывается полная картина:\n" +
    "• 📅 График активности по неделям\n" +
    "• 🏆 Рекорд серии за всё время\n" +
    "• 📈 % выполнения плана за месяц\n" +
    "• Умная серия по твоим дням тренировок\n\n" +
    "💰 Премиум: 149 ₽/мес",
};

async function showPremiumScreen(ctx, feature) {
  const text = PREMIUM_SCREENS[feature] ?? PREMIUM_SCREENS.workout_days;
  if (ctx.callbackQuery) {
    await ctx.editMessageText(text, { reply_markup: premiumBackKb() });
  } else {
    await ctx.reply(text, { reply_markup: premiumBackKb() });
  }
}

// ── Строим клавиатуру дней с учётом пользовательских дней ────────────────────
// days — массив тренировок [{name, exercises}, ...]
// userDays — ["Пн","Ср","Пт"] или null
// Возвращает объект { "Понедельник": 0, "Среда": 1, ... } для кнопок
const DAY_SHORT_TO_FULL = {
  "Пн": "Понедельник", "Вт": "Вторник",  "Ср": "Среда",
  "Чт": "Четверг",     "Пт": "Пятница",  "Сб": "Суббота", "Вс": "Воскресенье",
};
const DAY_ORDER = ["Понедельник","Вторник","Среда","Четверг","Пятница","Суббота","Воскресенье"];

function buildDayMap(planDays, userDays) {
  // planDays — массив тренировок по порядку
  // userDays — ["Пн","Ср","Пт"] или null

  if (userDays && userDays.length > 0) {
    // Сортируем пользовательские дни по порядку недели
    const sorted = [...userDays]
      .map(d => DAY_SHORT_TO_FULL[d] || d)
      .sort((a, b) => DAY_ORDER.indexOf(a) - DAY_ORDER.indexOf(b));

    // Назначаем тренировки по порядку на выбранные дни
    const map = {};
    sorted.forEach((dayName, i) => {
      if (i < planDays.length) {
        map[dayName] = i; // индекс тренировки
      }
    });
    return map;
  }

  // Нет пользовательских дней — дефолтное расписание
  const defaults = ["Понедельник", "Среда", "Пятница", "Вторник", "Четверг", "Суббота", "Воскресенье"];
  const map = {};
  planDays.forEach((_, i) => {
    map[defaults[i]] = i;
  });
  return map;
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

  const isPremium = user.is_premium;
  const userDays  = isPremium ? await getWorkoutDays(ctx.from.id) : null;
  const dayMap    = buildDayMap(plan.days, userDays);
  const totalDays = plan.days.length;
  const freeDays  = Math.min(3, totalDays);

  let hint = isPremium ? "Выбери день:" : `Бесплатно доступны первые ${freeDays} из ${totalDays} тренировок:`;
  if (isPremium && userDays?.length) {
    hint = `Твои дни: ${userDays.join(", ")}\n\nВыбери тренировку:`;
  }

  await ctx.editMessageText(
    `Цель: ${GOAL_LABELS[user.goal]} | Уровень: ${LEVEL_LABELS[user.level]}\n` +
    `Тренировок в неделю: ${totalDays}\n\n${hint}`,
    { reply_markup: workoutDaysKb(dayMap, isPremium) }
  );
}

export async function handleWorkoutCommand(ctx) {
  const user = await getUser(ctx.from.id);
  if (!user) { await ctx.reply(NO_PROFILE); return; }

  const plan = getWorkoutPlan(user.goal, user.level);
  if (!plan) { await ctx.reply("План не найден."); return; }

  const isPremium = user.is_premium;
  const userDays  = isPremium ? await getWorkoutDays(ctx.from.id) : null;
  const dayMap    = buildDayMap(plan.days, userDays);

  await ctx.reply(
    `Цель: ${GOAL_LABELS[user.goal]} | Уровень: ${LEVEL_LABELS[user.level]}\n` +
    `Тренировок в неделю: ${plan.days.length}\n\nВыбери день:`,
    { reply_markup: workoutDaysKb(dayMap, isPremium) }
  );
}

// ── Конкретный день тренировки ────────────────────────────────────────────────
export async function handleWorkoutDay(ctx) {
  const dayName = ctx.callbackQuery.data.replace("day_", "");
  const user    = await getUser(ctx.from.id);
  if (!user) { await ctx.editMessageText(NO_PROFILE, { reply_markup: backKb() }); return; }

  const plan = getWorkoutPlan(user.goal, user.level);
  if (!plan) { await ctx.editMessageText("План не найден.", { reply_markup: backKb() }); return; }

  const isPremium = user.is_premium;
  const userDays  = isPremium ? await getWorkoutDays(ctx.from.id) : null;
  const dayMap    = buildDayMap(plan.days, userDays);

  // Проверяем доступ — бесплатные могут только первые 3 тренировки
  const trainIndex = dayMap[dayName];
  if (trainIndex === undefined) {
    await ctx.editMessageText("День не найден.", { reply_markup: backKb() });
    return;
  }
  if (!isPremium && trainIndex >= 3) {
    await showPremiumScreen(ctx, "workout_days");
    return;
  }

  const workout = plan.days[trainIndex];
  await ctx.editMessageText(
    _formatWorkout(dayName, workout),
    { reply_markup: backKb() }
  );
}

export async function handleWorkoutLocked(ctx) {
  await showPremiumScreen(ctx, "workout_days");
}

export async function handleWorkoutUpsell(ctx) {
  await showPremiumScreen(ctx, "workout_days");
}

// Форматируем тренировку с полным описанием упражнений
function _formatWorkout(dayName, workout) {
  let text = `🏋️ ${dayName} — ${workout.name}\n\n`;
  workout.exercises.forEach((ex, i) => {
    text += `${i + 1}. ${ex.name}\n`;
    text += `   ${ex.sets} подх. × ${ex.reps}`;
    if (ex.rest && ex.rest !== "-") text += ` | отдых ${ex.rest}`;
    text += `\n`;
    if (ex.tip) text += `   💡 ${ex.tip}\n`;
    text += "\n";
  });
  return text.slice(0, 4096);
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
    gender:   user.gender,
    age:      user.age,
    weight:   parseFloat(user.weight),
    height:   parseFloat(user.height),
    goal:     user.goal,
    activity: user.activity ?? "moderate",
  });
  return (
    `Твоя норма КБЖУ\n\n` +
    `Пол: ${GENDER_LABELS[user.gender]}, возраст: ${user.age} лет\n` +
    `Вес: ${user.weight} кг | Рост: ${user.height} см\n` +
    `Цель: ${GOAL_LABELS[user.goal]}\n` +
    `Активность: ${ACTIVITY_LABELS[user.activity ?? "moderate"]}\n\n` +
    `Калории:  ${k.calories} ккал\n` +
    `Белки:    ${k.protein} г\n` +
    `Жиры:     ${k.fat} г\n` +
    `Углеводы: ${k.carbs} г\n\n` +
    `Распредели приёмы пищи на 4-5 раз в день.`
  );
}

// ── Трекер тренировок (для всех) ─────────────────────────────────────────────
export async function handleTrack(ctx) {
  const user = await getUser(ctx.from.id);
  if (!user) { await ctx.editMessageText(NO_PROFILE, { reply_markup: backKb() }); return; }

  await logWorkout(ctx.from.id);
  const streak = await getStreak(ctx.from.id);
  const fire   = streak > 0 ? "🔥".repeat(Math.min(streak, 10)) : "";

  let motivation;
  if (streak === 1)       motivation = "Отличное начало! Главное — не останавливаться 💪";
  else if (streak < 5)    motivation = "Серия растёт! Возвращайся в следующий тренировочный день 🚀";
  else if (streak < 10)   motivation = "Уже входит в привычку! Так держать 🔥";
  else if (streak < 20)   motivation = "Ты машина! Рекордная серия близко 🏆";
  else                    motivation = "Легендарный результат! Не останавливайся 🌟";

  const upsellHint = !user.is_premium
    ? "\n\nХочешь видеть график активности по неделям и рекорд серии? Это в Премиуме 📊"
    : "";

  await ctx.editMessageText(
    `✅ Тренировка засчитана!\n\n` +
    `Твоя серия: ${streak} ${_daysWord(streak)} ${fire}\n\n` +
    motivation + upsellHint,
    { reply_markup: backKb() }
  );
}

export async function handleTrackCommand(ctx) {
  const user = await getUser(ctx.from.id);
  if (!user) { await ctx.reply(NO_PROFILE); return; }

  await logWorkout(ctx.from.id);
  const streak = await getStreak(ctx.from.id);
  const fire   = streak > 0 ? "🔥".repeat(Math.min(streak, 10)) : "";

  await ctx.reply(
    `✅ Тренировка засчитана!\n\nТвоя серия: ${streak} ${_daysWord(streak)} ${fire}\n\nТак держать! 💪`,
    { reply_markup: backKb() }
  );
}

// ── Напоминания (Премиум) ─────────────────────────────────────────────────────
export async function handleReminders(ctx) {
  const user = await getUser(ctx.from.id);
  if (!user) { await ctx.editMessageText(NO_PROFILE, { reply_markup: backKb() }); return; }
  if (!user.is_premium) { await showPremiumScreen(ctx, "reminders"); return; }

  const isOn = user.reminders_enabled !== false; // default true
  const days = user.workout_days?.length
    ? `Твои дни: ${user.workout_days.join(", ")}`
    : "Дни не настроены — уведомления каждый день";

  const { InlineKeyboard } = await import("grammy");
  const kb = new InlineKeyboard()
    .text(isOn ? "🔕 Выключить напоминания" : "🔔 Включить напоминания", "reminders_toggle")
    .row()
    .text("🏠 Главное меню", "menu");

  const statusLine = isOn ? "🔔 Напоминания включены" : "🔕 Напоминания выключены";
  await ctx.editMessageText(
    `${statusLine}\n\n` +
    `Бот пишет в 9:00 по Москве в дни тренировок.\n` +
    `${days}\n\n` +
    `Настроить дни → /setdays`,
    { reply_markup: kb }
  );
}

export async function handleRemindersToggle(ctx) {
  const user = await getUser(ctx.from.id);
  if (!user) { await ctx.answerCallbackQuery(); return; }

  const newState = user.reminders_enabled === false ? true : false;
  await toggleReminders(ctx.from.id, newState);

  await ctx.answerCallbackQuery(newState ? "🔔 Напоминания включены" : "🔕 Напоминания выключены");

  // Перерисовываем экран
  const days = user.workout_days?.length
    ? `Твои дни: ${user.workout_days.join(", ")}`
    : "Дни не настроены — уведомления каждый день";

  const { InlineKeyboard } = await import("grammy");
  const kb = new InlineKeyboard()
    .text(newState ? "🔕 Выключить напоминания" : "🔔 Включить напоминания", "reminders_toggle")
    .row()
    .text("🏠 Главное меню", "menu");

  const statusLine = newState ? "🔔 Напоминания включены" : "🔕 Напоминания выключены";
  await ctx.editMessageText(
    `${statusLine}\n\n` +
    `Бот пишет в 9:00 по Москве в дни тренировок.\n` +
    `${days}\n\n` +
    `Настроить дни → /setdays`,
    { reply_markup: kb }
  );
}

// ── /today ────────────────────────────────────────────────────────────────────
export async function handleTodayCommand(ctx) {
  const user = await getUser(ctx.from.id);
  if (!user) { await ctx.reply(NO_PROFILE); return; }

  const todayFull = DAY_ORDER[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1];
  const plan      = getWorkoutPlan(user.goal, user.level);
  if (!plan) { await ctx.reply("План не найден."); return; }

  const userDays = user.is_premium ? await getWorkoutDays(ctx.from.id) : null;
  const dayMap   = buildDayMap(plan.days, userDays);

  if (dayMap[todayFull] !== undefined) {
    const workout = plan.days[dayMap[todayFull]];
    await ctx.reply(_formatWorkout(todayFull, workout), { reply_markup: backKb() });
  } else {
    await ctx.reply(`Сегодня — ${todayFull}\n\nДень отдыха! Восстанавливайся и питайся правильно. 🛌`, { reply_markup: backKb() });
  }
}

// ── Купить Премиум ────────────────────────────────────────────────────────────
export async function handlePremium(ctx) {
  const text =
    "⭐ Премиум — ФитПлан\n\n" +
    "Бесплатно у тебя уже есть:\n" +
    "✅ Трекер с серией дней\n" +
    "✅ 3 тренировки из плана\n" +
    "✅ Калории и план питания\n" +
    "✅ История веса\n\n" +
    "С Премиумом добавляется:\n" +
    "🏋️ Все тренировки + выбор своих дней\n" +
    "📊 График активности и рекорд серии\n" +
    "🗓 Меню питания на всю неделю\n" +
    "🔔 Напоминания под твоё расписание\n\n" +
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

  const current = getWeekNumber();
  await ctx.editMessageText(
    `🗓 Меню на неделю\n\nВыбери неделю (текущая — Неделя ${current}):`,
    { reply_markup: weekSelectKb(current) }
  );
}

export async function handleWeekSelect(ctx) {
  const user = await getUser(ctx.from.id);
  if (!user) { await ctx.editMessageText(NO_PROFILE, { reply_markup: backKb() }); return; }

  const weekNumber    = parseInt(ctx.callbackQuery.data.replace("week_select_", ""));
  const week          = getWeekNutrition(user.goal, weekNumber);
  if (!week) { await ctx.editMessageText("Меню не найдено.", { reply_markup: backKb() }); return; }

  const availableDays = Object.keys(week);
  const current       = getWeekNumber();
  const label         = weekNumber === current ? " (текущая)" : "";

  await ctx.editMessageText(
    `🗓 Неделя ${weekNumber}${label}\n\nВыбери день:`,
    { reply_markup: weekDaysKb(weekNumber, availableDays) }
  );
}

export async function handleWeekDay(ctx) {
  const user = await getUser(ctx.from.id);
  if (!user) { await ctx.editMessageText(NO_PROFILE, { reply_markup: backKb() }); return; }

  const parts      = ctx.callbackQuery.data.split("_");
  const weekNumber = parseInt(parts[2]);
  const dayName    = parts.slice(3).join("_");

  const week = getWeekNutrition(user.goal, weekNumber);
  if (!week) { await ctx.editMessageText("Меню не найдено.", { reply_markup: backKb() }); return; }

  const menu          = week[dayName] || "В этот день меню не задано — питайся по базовому плану.";
  const availableDays = Object.keys(week);
  const current       = getWeekNumber();
  const weekLabel     = weekNumber === current ? " (текущая)" : "";

  await ctx.editMessageText(
    `🗓 Неделя ${weekNumber}${weekLabel} — ${dayName}\n\n${menu}`,
    { reply_markup: weekDaysKb(weekNumber, availableDays) }
  );
}

// ── Прогресс ──────────────────────────────────────────────────────────────────
export async function handleProgress(ctx) {
  const user = await getUser(ctx.from.id);
  if (!user) { await ctx.editMessageText(NO_PROFILE, { reply_markup: backKb() }); return; }

  const isPremium = user.is_premium;
  const promises  = [getStreak(ctx.from.id), getMonthStats(ctx.from.id), getWeightHistory(ctx.from.id, 8)];
  if (isPremium) {
    promises.push(getBestStreak(ctx.from.id));
    promises.push(getWeeklyStats(ctx.from.id, 4));
  }
  const [streak, monthCount, weightHistory, bestStreak, weeklyStats] = await Promise.all(promises);

  let text = "📊 Твой прогресс\n\n🏋️ Тренировки\n";
  text += `🔥 Серия: ${streak} ${_daysWord(streak)}`;
  text += streak > 0 ? " " + "🔥".repeat(Math.min(streak, 5)) : "";
  text += "\n";
  text += `📅 Тренировок в этом месяце: ${monthCount}\n`;

  if (isPremium) {
    text += `🏆 Рекорд серии: ${bestStreak} ${_daysWord(bestStreak)}\n`;
    if (weeklyStats?.some(w => w.planned > 0)) {
      text += "\nАктивность по неделям:\n";
      const labels = ["Эта неделя  ", "Прошлая     ", "2 нед. назад", "3 нед. назад"];
      weeklyStats.forEach((w, i) => {
        if (w.planned === 0) return;
        const filled = Math.round((w.done / w.planned) * 10);
        const bar    = "█".repeat(filled) + "░".repeat(10 - filled);
        text += `${labels[i]}  ${bar}  ${w.done}/${w.planned}\n`;
      });
    }
  } else {
    text += "\n📈 График по неделям и рекорд — в Премиуме\n";
  }

  text += "\n─────────────────\n⚖️ Динамика веса\n";

  if (weightHistory.length === 0) {
    text += `\nТекущий вес: ${user.weight} кг (из профиля)\n`;
    text += "Нажми «Записать вес» чтобы начать отслеживать динамику.";
  } else {
    const first   = weightHistory[0];
    const last    = weightHistory[weightHistory.length - 1];
    const diff    = parseFloat(last.weight) - parseFloat(first.weight);
    const diffStr = diff > 0 ? `+${diff.toFixed(1)}` : diff.toFixed(1);
    const weeks   = Math.max(1, Math.round(
      (new Date(last.date) - new Date(first.date)) / (7 * 24 * 60 * 60 * 1000)
    ));
    text += `\nСтарт: ${first.weight} кг → Сейчас: ${last.weight} кг\n`;
    text += `Изменение: ${diffStr} кг за ${weeks} ${_weeksWord(weeks)} ${_weightEmoji(user.goal, diff)}\n\n`;

    const weights = weightHistory.map(r => parseFloat(r.weight));
    const minW    = Math.min(...weights);
    const maxW    = Math.max(...weights);
    const range   = maxW - minW || 1;
    weightHistory.forEach(r => {
      const w      = parseFloat(r.weight);
      const filled = Math.round(((w - minW) / range) * 10);
      const bar    = "━".repeat(filled) || "╸";
      text += `${_formatDate(new Date(r.date))}  ${w.toFixed(1)} кг  ${bar}\n`;
    });
  }

  await ctx.editMessageText(text, { reply_markup: progressKb(isPremium) });
}

export async function handleProgressUpsell(ctx) {
  await showPremiumScreen(ctx, "progress_upsell");
}

export async function handleLogWeight(ctx) {
  setData(ctx.from.id, "_weightMode", true);
  setStep(ctx.from.id, STEPS.LOG_WEIGHT);
  await ctx.editMessageText(
    "⚖️ Введи свой текущий вес в кг:\n(например: 75.5)",
    { reply_markup: backKb() }
  );
}

export async function handleWeightInput(ctx) {
  const text   = ctx.message.text.trim().replace(",", ".");
  const weight = parseFloat(text);

  if (isNaN(weight) || weight < 30 || weight > 300) {
    await ctx.reply("Введи корректный вес (от 30 до 300 кг):");
    return;
  }

  await logWeight(ctx.from.id, weight);

  const history = await getWeightHistory(ctx.from.id, 2);
  let reply = `✅ Вес записан: ${weight} кг`;
  if (history.length >= 2) {
    const prev = parseFloat(history[0].weight);
    const diff = weight - prev;
    reply += `\nИзменение с прошлого раза: ${diff > 0 ? "+" : ""}${diff.toFixed(1)} кг`;
  }

  clearSession(ctx.from.id);
  const user = await getUser(ctx.from.id);
  await ctx.reply(reply, { reply_markup: mainMenuKb(user?.is_premium) });
}

// ── Утилиты ───────────────────────────────────────────────────────────────────
function _daysWord(n) {
  if (n % 100 >= 11 && n % 100 <= 14) return "дней";
  if (n % 10 === 1) return "день";
  if (n % 10 >= 2 && n % 10 <= 4) return "дня";
  return "дней";
}

function _weeksWord(n) {
  if (n % 100 >= 11 && n % 100 <= 14) return "недель";
  if (n % 10 === 1) return "неделю";
  if (n % 10 >= 2 && n % 10 <= 4) return "недели";
  return "недель";
}

function _weightEmoji(goal, diff) {
  if (goal === "lose")     return diff < -0.5 ? "💪" : diff > 0.5 ? "😬" : "➡️";
  if (goal === "gain")     return diff > 0.5  ? "💪" : diff < -0.5 ? "😬" : "➡️";
  if (goal === "relief")   return Math.abs(diff) < 1 ? "💪" : "➡️";
  if (goal === "maintain") return Math.abs(diff) < 1 ? "✅" : "➡️";
  return "";
}

function _formatDate(d) {
  const day = String(d.getDate()).padStart(2, "0");
  const mon = ["янв","фев","мар","апр","май","июн","июл","авг","сен","окт","ноя","дек"][d.getMonth()];
  return `${day} ${mon}`;
}
