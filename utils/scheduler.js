import cron from "node-cron";
import { getAllUsers } from "../database/db.js";

export function setupScheduler(bot) {
  // Каждый день в 9:00 по Москве (UTC+3 = 06:00 UTC)
  cron.schedule("0 6 * * *", async () => {
    const users = await getAllUsers();
    for (const user of users) {
      try {
        await bot.api.sendMessage(
          user.telegram_id,
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
