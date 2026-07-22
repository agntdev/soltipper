import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard } from "../toolkit/index.js";
import { getDataStore } from "../bot.js";

const composer = new Composer<Ctx>();

const backToMenu = inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]);

composer.callbackQuery("balance:show", async (ctx) => {
  await ctx.answerCallbackQuery();
  const store = getDataStore();
  const user = await store.users.get(ctx.from?.id ?? 0);
  const balance = user?.balance ?? 0;
  const text =
    balance > 0
      ? `💰 Your balance: ${balance.toFixed(4)} SOL`
      : "💰 Your balance: 0 SOL\n\nNo funds yet — tap 💳 Deposit to add SOL.";
  await ctx.editMessageText(text, { reply_markup: backToMenu });
});

export default composer;
