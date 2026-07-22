import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard } from "../toolkit/index.js";
import { getDataStore } from "../bot.js";

const composer = new Composer<Ctx>();

const backToMenu = inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]);

composer.callbackQuery("admin:dashboard", async (ctx) => {
  await ctx.answerCallbackQuery();
  const store = getDataStore();

  const users = await store.users.getAll();
  const totalUsers = users.length;
  const totalBalance = users.reduce((sum, u) => sum + (u.balance ?? 0), 0);

  const withdrawals = await store.withdrawals.getAll();
  const pendingWithdrawals = withdrawals.filter((w) => w.status === "pending");
  const completedWithdrawals = withdrawals.filter((w) => w.status === "completed");

  const tips = await store.tips.getAll();
  const totalTipped = tips.reduce((sum, t) => sum + (t.amount ?? 0), 0);

  const lines = [
    "📊 Admin Dashboard",
    "",
    `👥 Users: ${totalUsers}`,
    `💰 Total balance: ${totalBalance.toFixed(4)} SOL`,
    `🎯 Tips processed: ${tips.length} (${totalTipped.toFixed(4)} SOL total)`,
    `📤 Withdrawals: ${completedWithdrawals.length} completed, ${pendingWithdrawals.length} pending`,
  ];

  if (pendingWithdrawals.length > 0) {
    lines.push("", "⏳ Pending withdrawals:");
    for (const wd of pendingWithdrawals.slice(0, 5)) {
      lines.push(`  • ${wd.amount.toFixed(4)} SOL → ${wd.target_address.slice(0, 8)}...`);
    }
  }

  await ctx.editMessageText(lines.join("\n"), { reply_markup: backToMenu });
});

export default composer;
