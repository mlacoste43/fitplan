import cron from "node-cron";
import { getAllUsers, getUser } from "../database/db.js";

const DAYS_SHORT = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];

export function setupScheduler(bot) {
  // Каждый день в 9:00 по Москве (UTC+3 = 06:00 UTC)
  cron.schedule("0 6 * * *", async () => {
    const users = await getAllUsers();
    const todayShort = DAYS_SHORT[new Date().getDay()];

    for (const { telegram_id } of users) {
      try {
        const user = await getUser(telegram_id);
        if (!user) continue;

        // Только премиум получают напоминания
        if (!user.is_premium) continue;

        // Напоминания выключены пользователем
        if (user.reminders_enabled === false) continue;

        // С настроенными днями — только в их дни
        if (user.workout_days?.length > 0) {
          if (!user.workout_days.includes(todayShort)) continue;
        }

        await bot.api.sendMessage(
          telegram_id,
          "💪 Привет! Сегодня день тренировки — не пропускай!\n\n" +
          "Нажми /today чтобы открыть программу на сегодня."
        );
      } catch {
        // пользователь заблокировал бота — пропускаем
      }
    }
  });

  console.log("✅ Планировщик напоминаний запущен");
}
