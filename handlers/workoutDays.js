// handlers/workoutDays.js
// Настройка дней тренировок — только для премиум пользователей

import { getUser, saveWorkoutDays, getWorkoutDays } from "../database/db.js";
import { backKb } from "../keyboards/kb.js";
import { InlineKeyboard } from "grammy";

const NO_PROFILE = "Сначала создай профиль — нажми /start";

const ALL_DAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

// Клавиатура выбора дней — отмеченные дни показываются с ✅
function buildDaysKb(selected = []) {
  const kb = new InlineKeyboard();

  ALL_DAYS.forEach((day, i) => {
    const isOn = selected.includes(day);
    kb.text(isOn ? `✅ ${day}` : day, `wday_toggle_${day}`);
    // По 4 кнопки в ряду, потом перенос
    if (i === 3) kb.row();
  });

  kb.row();
  kb.text("💾 Сохранить", "wday_save");
  kb.text("◀️ Назад", "menu");

  return kb;
}

// Хранилище временного выбора (до нажатия "Сохранить")
const pendingDays = new Map();

// /setdays или кнопка из меню
export async function handleSetDays(ctx) {
  const user = await getUser(ctx.from.id);
  if (!user) {
    const reply = ctx.callbackQuery
      ? ctx.editMessageText(NO_PROFILE, { reply_markup: backKb() })
      : ctx.reply(NO_PROFILE);
    await reply;
    return;
  }

  if (!user.is_premium) {
    const text =
      "⭐️ Выбор дней тренировок доступен только для премиум подписчиков.\n\n" +
      "Нажми /premium чтобы узнать подробности.";
    if (ctx.callbackQuery) {
      await ctx.editMessageText(text, { reply_markup: backKb() });
    } else {
      await ctx.reply(text, { reply_markup: backKb() });
    }
    return;
  }

  // Инициализируем pending текущими сохранёнными днями (или пустым массивом)
  const saved = await getWorkoutDays(ctx.from.id);
  pendingDays.set(ctx.from.id, saved ? [...saved] : []);

  const text = _buildText(pendingDays.get(ctx.from.id));

  if (ctx.callbackQuery) {
    await ctx.editMessageText(text, {
      reply_markup: buildDaysKb(pendingDays.get(ctx.from.id)),
    });
  } else {
    await ctx.reply(text, {
      reply_markup: buildDaysKb(pendingDays.get(ctx.from.id)),
    });
  }
}

// Тогл конкретного дня
export async function handleToggleDay(ctx) {
  const day = ctx.callbackQuery.data.replace("wday_toggle_", "");

  if (!pendingDays.has(ctx.from.id)) {
    // Сессия пропала (перезапуск бота) — восстанавливаем из БД
    const saved = await getWorkoutDays(ctx.from.id);
    pendingDays.set(ctx.from.id, saved ? [...saved] : []);
  }

  const current = pendingDays.get(ctx.from.id);
  const idx = current.indexOf(day);
  if (idx === -1) {
    current.push(day);
  } else {
    current.splice(idx, 1);
  }

  await ctx.editMessageText(_buildText(current), {
    reply_markup: buildDaysKb(current),
  });
  await ctx.answerCallbackQuery();
}

// Сохранение выбора
export async function handleSaveDays(ctx) {
  const days = pendingDays.get(ctx.from.id) || [];

  if (days.length === 0) {
    await ctx.answerCallbackQuery("Выбери хотя бы один день!");
    return;
  }

  await saveWorkoutDays(ctx.from.id, days);
  pendingDays.delete(ctx.from.id);

  await ctx.editMessageText(
    `✅ Дни тренировок сохранены: ${days.join(", ")}\n\nБот будет напоминать тебе именно в эти дни!`,
    { reply_markup: backKb() }
  );
  await ctx.answerCallbackQuery("Сохранено!");
}

function _buildText(selected) {
  return (
    "📅 Выбери дни тренировок\n\n" +
    "Нажми на день чтобы отметить/снять отметку.\n\n" +
    (selected.length > 0
      ? `Выбрано: ${selected.join(", ")}`
      : "Пока ничего не выбрано")
  );
}
