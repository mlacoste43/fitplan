import { genderKb, goalKb, levelKb, mainMenuKb, activityKb, paramsMenuKb } from "../keyboards/kb.js";
import { saveUser, getUser, pool } from "../database/db.js";
import { getSession, setStep, setData, getData, clearSession, STEPS } from "../utils/session.js";
import { ACTIVITY_LABELS, GOAL_LABELS, LEVEL_LABELS, GENDER_LABELS } from "../plans/data.js";

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
  const gender  = ctx.callbackQuery.data.replace("gender_", "");
  const session = getSession(ctx.from.id);

  if (session.data?._editMode) {
    await pool.query(`UPDATE users SET gender = $1 WHERE telegram_id = $2`, [gender, ctx.from.id]);
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
  const goal    = ctx.callbackQuery.data.replace("goal_", "");
  const session = getSession(ctx.from.id);

  if (session.data?._editMode) {
    await pool.query(`UPDATE users SET goal = $1 WHERE telegram_id = $2`, [goal, ctx.from.id]);
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
  const level   = ctx.callbackQuery.data.replace("level_", "");
  const session = getSession(ctx.from.id);

  if (session.data?._editMode) {
    await pool.query(`UPDATE users SET level = $1 WHERE telegram_id = $2`, [level, ctx.from.id]);
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
    activity:   data.activity ?? "moderate",
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
      await pool.query(`UPDATE users SET age = $1 WHERE telegram_id = $2`, [age, ctx.from.id]);
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
      await pool.query(`UPDATE users SET weight = $1 WHERE telegram_id = $2`, [weight, ctx.from.id]);
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
      await pool.query(`UPDATE users SET height = $1 WHERE telegram_id = $2`, [height, ctx.from.id]);
      clearSession(ctx.from.id);
      const user = await getUser(ctx.from.id);
      await ctx.reply("✅ Рост обновлён!", { reply_markup: mainMenuKb(user?.is_premium) });
      return;
    }
    setData(ctx.from.id, "height", height);
    setStep(ctx.from.id, STEPS.ACTIVITY);
    await ctx.reply(
      "Какой у тебя уровень физической активности?\n\n" +
      "Это важно для точного расчёта калорий:",
      { reply_markup: activityKb() }
    );
    return;
  }
}

// ── Активность (онбординг + редактирование) ────────────────────────────────────
export async function handleActivity(ctx) {
  const activity = ctx.callbackQuery.data.replace("activity_", "");
  const session  = getSession(ctx.from.id);

  if (session.data?._editMode) {
    await saveField(ctx.from.id, "activity", activity);
    clearSession(ctx.from.id);
    const user = await getUser(ctx.from.id);
    await ctx.editMessageText("✅ Уровень активности обновлён!", { reply_markup: mainMenuKb(user?.is_premium) });
    return;
  }

  // Онбординг: сохраняем и идём к цели
  setData(ctx.from.id, "activity", activity);
  setStep(ctx.from.id, STEPS.GOAL);
  await ctx.editMessageText("Какая у тебя цель?", { reply_markup: goalKb() });
}

export async function handleEditActivity(ctx) {
  setData(ctx.from.id, "_editMode", true);
  setStep(ctx.from.id, STEPS.ACTIVITY);
  await ctx.editMessageText(
    "Выбери уровень физической активности:",
    { reply_markup: activityKb() }
  );
}

export async function handleRestart(ctx) {
  setStep(ctx.from.id, STEPS.GENDER);
  await ctx.editMessageText("Укажи свой пол:", { reply_markup: genderKb() });
}

// ── Меню параметров ────────────────────────────────────────────────────────────
export async function handleParams(ctx) {
  const user = await getUser(ctx.from.id);
  if (!user) { await ctx.editMessageText("Сначала создай профиль — нажми /start"); return; }

  await ctx.editMessageText(
    `⚙️ Твои параметры:\n\n` +
    `👤 Пол: ${GENDER_LABELS[user.gender] ?? user.gender}\n` +
    `🎂 Возраст: ${user.age} лет\n` +
    `⚖️ Вес: ${user.weight} кг\n` +
    `📏 Рост: ${user.height} см\n` +
    `🎯 Цель: ${GOAL_LABELS[user.goal] ?? user.goal}\n` +
    `💡 Уровень: ${LEVEL_LABELS[user.level] ?? user.level}\n` +
    `🏃 Активность: ${ACTIVITY_LABELS[user.activity ?? "moderate"]}\n\n` +
    `Что хочешь изменить?`,
    { reply_markup: paramsMenuKb() }
  );
}

// Сохранение одного поля в БД
async function saveField(telegramId, field, value) {
  await pool.query(
    `UPDATE users SET ${field} = $1 WHERE telegram_id = $2`,
    [value, telegramId]
  );
}

// ── Редактирование отдельных параметров ───────────────────────────────────────
export async function handleEditGender(ctx) {
  setData(ctx.from.id, "_editMode", true);
  setStep(ctx.from.id, STEPS.GENDER);
  await ctx.editMessageText("Укажи свой пол:", { reply_markup: genderKb() });
}

export async function handleEditGoal(ctx) {
  setData(ctx.from.id, "_editMode", true);
  setStep(ctx.from.id, STEPS.GOAL);
  await ctx.editMessageText("Выбери цель:", { reply_markup: goalKb() });
}

export async function handleEditLevel(ctx) {
  setData(ctx.from.id, "_editMode", true);
  setStep(ctx.from.id, STEPS.LEVEL);
  await ctx.editMessageText("Выбери уровень подготовки:", { reply_markup: levelKb() });
}

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

// Обновляем handleGender/Goal/Level с поддержкой editMode
// (handleGender уже обрабатывает editMode через session.data._editMode — см. выше)
