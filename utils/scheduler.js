import cron from "node-cron";
import { getAllUsers, getUser } from "../database/db.js";

const DAYS_SHORT = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];

export function setupScheduler(bot) {
  // Каждый день в 9:00 по Москве (UTC+3 = 06:00 UTC)
  cron.schedule("0 6 * * *", async () => {
    const users = await getAllUsers();
    const todayShort = DAYS_SHORT[new Date().getDay()]; // "Пн", "Вт" и т.д.

    for (const { telegram_id } of users) {
      try {
        const user = await getUser(telegram_id);
        if (!user) continue;

        // Премиум с настроенными днями — отправляем только в их дни
        if (user.is_premium && user.workout_days?.length > 0) {
          if (!user.workout_days.includes(todayShort)) continue;
        }

        await bot.api.sendMessage(
          telegram_id,
          "💪 Привет! Не забудь про тренировку сегодня.\n\n" +
          "Нажми /today чтобы узнать программу на сегодня."
        );
      } catch {
        // пользователь заблокировал бота — пропускаем
      }
    }
  });

  console.log("✅ Планировщик напоминаний запущен");
}
