import { genderKb, goalKb, levelKb, mainMenuKb, paramsMenuKb } from "../keyboards/kb.js";
import { saveUser, getUser, pool } from "../database/db.js";
import { getSession, setStep, setData, getData, clearSession, STEPS } from "../utils/session.js";

export async function handleStart(ctx) {
  const user = await getUser(ctx.from.id);

  if (user) {
    await ctx.reply(
      `С возвращением, ${ctx.from.first_name}!\n\nВыбери что тебя интересует:`,
      { reply_markup: mainMenuKb(user.is_premium) }
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
  const session = getSession(ctx.from.id);

  if (session.data?._editMode) {
    await saveField(ctx.from.id, "gender", gender);
    clearSession(ctx.from.id);
    const user = await getUser(ctx.from.id);
    await ctx.editMessageText("✅ Пол обновлён!", { reply_markup: mainMenuKb(user?.is_premium) });
    return;
  }

  setData(ctx.from.id, "gender", gender);
  setStep(ctx.from.id, STEPS.AGE);
  await ctx.editMessageText("Сколько тебе лет? Введи цифру:");
}

export async function handleGoal(ctx) {
  const goal = ctx.callbackQuery.data.replace("goal_", "");
  const session = getSession(ctx.from.id);

  if (session.data?._editMode) {
    await saveField(ctx.from.id, "goal", goal);
    clearSession(ctx.from.id);
    const user = await getUser(ctx.from.id);
    await ctx.editMessageText("✅ Цель обновлена!", { reply_markup: mainMenuKb(user?.is_premium) });
    return;
  }

  setData(ctx.from.id, "goal", goal);
  setStep(ctx.from.id, STEPS.LEVEL);
  await ctx.editMessageText("Какой у тебя уровень подготовки?", { reply_markup: levelKb() });
}

export async function handleLevel(ctx) {
  const level = ctx.callbackQuery.data.replace("level_", "");
  const session = getSession(ctx.from.id);

  if (session.data?._editMode) {
    await saveField(ctx.from.id, "level", level);
    clearSession(ctx.from.id);
    const user = await getUser(ctx.from.id);
    await ctx.editMessageText("✅ Уровень обновлён!", { reply_markup: mainMenuKb(user?.is_premium) });
    return;
  }

  const data = getData(ctx.from.id);
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
    { reply_markup: mainMenuKb(false) }
  );
}

export async function handleTextInput(ctx) {
  const session = getSession(ctx.from.id);
  const text    = ctx.message.text.trim().replace(",", ".");
  const isEdit  = session.data?._editMode;

  if (session.step === STEPS.AGE) {
    const age = parseInt(text);
    if (isNaN(age) || age < 10 || age > 100) {
      await ctx.reply("Введи корректный возраст (от 10 до 100):");
      return;
    }
    if (isEdit) {
      await saveField(ctx.from.id, "age", age);
      clearSession(ctx.from.id);
      const user = await getUser(ctx.from.id);
      await ctx.reply("✅ Возраст обновлён!", { reply_markup: mainMenuKb(user?.is_premium) });
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
    if (isEdit) {
      await saveField(ctx.from.id, "weight", weight);
      clearSession(ctx.from.id);
      const user = await getUser(ctx.from.id);
      await ctx.reply("✅ Вес обновлён!", { reply_markup: mainMenuKb(user?.is_premium) });
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
    if (isEdit) {
      await saveField(ctx.from.id, "height", height);
      clearSession(ctx.from.id);
      const user = await getUser(ctx.from.id);
      await ctx.reply("✅ Рост обновлён!", { reply_markup: mainMenuKb(user?.is_premium) });
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

// ── Меню параметров ────────────────────────────────────────────────────────────
export async function handleParams(ctx) {
  const user = await getUser(ctx.from.id);
  if (!user) { await ctx.editMessageText("Сначала создай профиль — нажми /start"); return; }

  const GOAL_LABELS   = { lose: "Похудение", gain: "Набор массы", relief: "Рельеф", maintain: "Поддержание" };
  const LEVEL_LABELS  = { beginner: "Новичок", intermediate: "Средний", advanced: "Продвинутый" };
  const GENDER_LABELS = { male: "Мужской", female: "Женский" };

  await ctx.editMessageText(
    `⚙️ Твои параметры:\n\n` +
    `👤 Пол: ${GENDER_LABELS[user.gender] ?? user.gender}\n` +
    `🎂 Возраст: ${user.age} лет\n` +
    `⚖️ Вес: ${user.weight} кг\n` +
    `📏 Рост: ${user.height} см\n` +
    `🎯 Цель: ${GOAL_LABELS[user.goal] ?? user.goal}\n` +
    `💡 Уровень: ${LEVEL_LABELS[user.level] ?? user.level}\n\n` +
    `Что хочешь изменить?`,
    { reply_markup: paramsMenuKb() }
  );
}

// ── Редактирование отдельных параметров ───────────────────────────────────────

// Пол
export async function handleEditGender(ctx) {
  setData(ctx.from.id, "_editMode", true);
  setStep(ctx.from.id, STEPS.GENDER);
  await ctx.editMessageText("Укажи свой пол:", { reply_markup: genderKb() });
}

// Цель
export async function handleEditGoal(ctx) {
  setData(ctx.from.id, "_editMode", true);
  setStep(ctx.from.id, STEPS.GOAL);
  await ctx.editMessageText("Выбери цель:", { reply_markup: goalKb() });
}

// Уровень
export async function handleEditLevel(ctx) {
  setData(ctx.from.id, "_editMode", true);
  setStep(ctx.from.id, STEPS.LEVEL);
  await ctx.editMessageText("Выбери уровень подготовки:", { reply_markup: levelKb() });
}

// Возраст / Вес / Рост — ждём текст
export async function handleEditAge(ctx) {
  setData(ctx.from.id, "_editMode", true);
  setStep(ctx.from.id, STEPS.AGE);
  await ctx.editMessageText("Введи новый возраст (лет):");
}

export async function handleEditWeight(ctx) {
  setData(ctx.from.id, "_editMode", true);
  setStep(ctx.from.id, STEPS.WEIGHT);
  await ctx.editMessageText("Введи новый вес в кг (например: 75):");
}

export async function handleEditHeight(ctx) {
  setData(ctx.from.id, "_editMode", true);
  setStep(ctx.from.id, STEPS.HEIGHT);
  await ctx.editMessageText("Введи новый рост в см (например: 175):");
}

// Сохранение одного поля в БД
async function saveField(telegramId, field, value) {
  await pool.query(
    `UPDATE users SET ${field} = $1 WHERE telegram_id = $2`,
    [value, telegramId]
  );
}