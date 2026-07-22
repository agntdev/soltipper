import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { mainMenuKeyboard, registerMainMenuItem } from "../toolkit/index.js";
import { getDataStore } from "../bot.js";

registerMainMenuItem({ label: "💰 Balance", data: "balance:show", order: 10 });
registerMainMenuItem({ label: "💳 Deposit", data: "deposit:show", order: 20 });
registerMainMenuItem({ label: "📤 Withdraw", data: "withdraw:show", order: 30 });
registerMainMenuItem({ label: "🎯 Tip", data: "tip:start", order: 40 });
registerMainMenuItem({ label: "📊 Admin", data: "admin:dashboard", order: 50 });

const WELCOME = "👋 Welcome! Tap a button below to get started.";

const composer = new Composer<Ctx>();

composer.command("start", async (ctx) => {
  const from = ctx.from;
  if (!from) return;
  const store = getDataStore();
  const existing = await store.users.get(from.id);
  if (!existing) {
    await store.users.set(from.id, {
      telegram_id: from.id,
      display_name: from.first_name ?? "User",
      balance: 0,
    });
    await store.users.addId(from.id);
  }
  await ctx.reply(WELCOME, { reply_markup: mainMenuKeyboard() });
});

composer.callbackQuery("menu:main", async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.editMessageText(WELCOME, { reply_markup: mainMenuKeyboard() });
});

export default composer;
