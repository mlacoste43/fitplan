import { genderKb, goalKb, levelKb, mainMenuKb } from "../keyboards/kb.js";
import { saveUser, getUser } from "../database/db.js";
import { getSession, setStep, setData, getData, clearSession, STEPS } from "../utils/session.js";

export async function handleStart(ctx) {
  const user = await getUser(ctx.from.id);

  if (user) {
    await ctx.reply(
      `С возвращением, ${ctx.from.first_name}!\n\nВыбери что тебя интересует:`,
      { reply_markup: mainMenuKb() }
    );
    return;
  }

  setStep(ctx.from.id, STEPS.GENDER);
  await ctx.reply(
    "Привет! Я ФитПлан — твой личный тренер и диетолог в Telegram.\n\n" +
    "За 1 минуту подберу план питания и тренировок под твои цели.\n\n" +
    "Давай начнём! Укажи свой пол:",
    { reply_markup: genderKb() }
  );
}

export async function handleGender(ctx) {
  const gender = ctx.callbackQuery.data.replace("gender_", "");
  setData(ctx.from.id, "gender", gender);
  setStep(ctx.from.id, STEPS.AGE);
  await ctx.editMessageText("Сколько тебе лет? Введи цифру:");
}

export async function handleGoal(ctx) {
  const goal = ctx.callbackQuery.data.replace("goal_", "");
  setData(ctx.from.id, "goal", goal);
  setStep(ctx.from.id, STEPS.LEVEL);
  await ctx.editMessageText("Какой у тебя уровень подготовки?", { reply_markup: levelKb() });
}

export async function handleLevel(ctx) {
  const level = ctx.callbackQuery.data.replace("level_", "");
  const data  = getData(ctx.from.id);
  clearSession(ctx.from.id);

  await saveUser({
    telegramId: ctx.from.id,
    username:   ctx.from.username || "",
    gender:     data.gender,
    age:        data.age,
    weight:     data.weight,
    height:     data.height,
    goal:       data.goal,
    level,
  });

  await ctx.editMessageText(
    "Отлично! Твой профиль создан.\n\nВыбери что хочешь посмотреть:",
    { reply_markup: mainMenuKb() }
  );
}

export async function handleTextInput(ctx) {
  const session = getSession(ctx.from.id);
  const text    = ctx.message.text.trim().replace(",", ".");

  if (session.step === STEPS.AGE) {
    const age = parseInt(text);
    if (isNaN(age) || age < 10 || age > 100) {
      await ctx.reply("Введи корректный возраст (от 10 до 100):");
      return;
    }
    setData(ctx.from.id, "age", age);
    setStep(ctx.from.id, STEPS.WEIGHT);
    await ctx.reply("Введи свой вес в кг (например: 75):");
    return;
  }

  if (session.step === STEPS.WEIGHT) {
    const weight = parseFloat(text);
    if (isNaN(weight) || weight < 30 || weight > 300) {
      await ctx.reply("Введи корректный вес (от 30 до 300 кг):");
      return;
    }
    setData(ctx.from.id, "weight", weight);
    setStep(ctx.from.id, STEPS.HEIGHT);
    await ctx.reply("Введи свой рост в см (например: 175):");
    return;
  }

  if (session.step === STEPS.HEIGHT) {
    const height = parseFloat(text);
    if (isNaN(height) || height < 100 || height > 250) {
      await ctx.reply("Введи корректный рост (от 100 до 250 см):");
      return;
    }
    setData(ctx.from.id, "height", height);
    setStep(ctx.from.id, STEPS.GOAL);
    await ctx.reply("Какая у тебя цель?", { reply_markup: goalKb() });
    return;
  }
}

export async function handleRestart(ctx) {
  setStep(ctx.from.id, STEPS.GENDER);
  await ctx.editMessageText("Укажи свой пол:", { reply_markup: genderKb() });
}
