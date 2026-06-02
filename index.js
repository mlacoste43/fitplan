import "dotenv/config";
import { Bot } from "grammy";
import { createServer } from "http";
import { initDB } from "./database/db.js";
import { setupScheduler } from "./utils/scheduler.js";
import { getSession, STEPS } from "./utils/session.js";

import {
  handleStart,
  handleGender,
  handleGoal,
  handleLevel,
  handleTextInput,
  handleRestart,
} from "./handlers/onboarding.js";

import {
  handleMenu,
  handleMenuCommand,
  handleNutrition,
  handlePlanCommand,
  handleWorkout,
  handleWorkoutCommand,
  handleWorkoutDay,
  handleCalories,
  handleCaloriesCommand,
  handleTrack,
  handleTrackCommand,
  handleTodayCommand,
  handlePremium,
  handleWeekMenu,
  handleWeekToday,
  handleWeekFull,
} from "./handlers/plans.js";

import {
  handleSetDays,
  handleToggleDay,
  handleSaveDays,
} from "./handlers/workoutDays.js";

// ── HTTP сервер для Render ────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
createServer((req, res) => {
  res.writeHead(200);
  res.end("ФитПлан работает!");
}).listen(PORT, () => console.log(`HTTP сервер запущен на порту ${PORT}`));

// ── Бот ───────────────────────────────────────────────────────────────────────
const bot = new Bot(process.env.BOT_TOKEN);
await initDB();

// ── Команды ───────────────────────────────────────────────────────────────────
bot.command("start",    handleStart);
bot.command("menu",     handleMenuCommand);
bot.command("plan",     handlePlanCommand);
bot.command("workout",  handleWorkoutCommand);
bot.command("calories", handleCaloriesCommand);
bot.command("track",    handleTrackCommand);
bot.command("today",    handleTodayCommand);
bot.command("premium",  handlePremium);
bot.command("setdays",  handleSetDays);   // ← новая команда

// ── Кнопки онбординга ─────────────────────────────────────────────────────────
bot.callbackQuery(/^gender_/, handleGender);
bot.callbackQuery(/^goal_/,   handleGoal);
bot.callbackQuery(/^level_/,  handleLevel);
bot.callbackQuery("restart",  handleRestart);

// ── Кнопки меню ───────────────────────────────────────────────────────────────
bot.callbackQuery("menu",      handleMenu);
bot.callbackQuery("nutrition", handleNutrition);
bot.callbackQuery("workout",   handleWorkout);
bot.callbackQuery(/^day_/,     handleWorkoutDay);
bot.callbackQuery("calories",  handleCalories);
bot.callbackQuery("track",     handleTrack);
bot.callbackQuery("premium",   handlePremium);
bot.callbackQuery("setdays",   handleSetDays);  // ← кнопка из меню

// ── Выбор дней тренировок (премиум) ──────────────────────────────────────────
bot.callbackQuery(/^wday_toggle_/, handleToggleDay);
bot.callbackQuery("wday_save",     handleSaveDays);

// ── Недельное меню ────────────────────────────────────────────────────────────
bot.callbackQuery("week_menu",  handleWeekMenu);
bot.callbackQuery("week_today", handleWeekToday);
bot.callbackQuery("week_full",  handleWeekFull);

// ── Текстовые сообщения ───────────────────────────────────────────────────────
bot.on("message:text", async (ctx) => {
  const session = getSession(ctx.from.id);
  const onboardingSteps = [STEPS.AGE, STEPS.WEIGHT, STEPS.HEIGHT];
  if (onboardingSteps.includes(session.step)) {
    await handleTextInput(ctx);
  }
});

bot.on("callback_query", (ctx) => ctx.answerCallbackQuery());

bot.catch((err) => console.error("Ошибка:", err.message));

setupScheduler(bot);
bot.start({ onStart: () => console.log("🚀 ФитПлан бот запущен!") });
