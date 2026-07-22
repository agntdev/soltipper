import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard } from "../toolkit/index.js";
import { getDataStore } from "../bot.js";

const composer = new Composer<Ctx>();

const backToMenu = inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]);

function generateDepositAddress(userId: number): string {
  const chars = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  let addr = "";
  for (let i = 0; i < 44; i++) {
    addr += chars[(userId * (i + 1) * 7 + i * 13) % chars.length];
  }
  return addr;
}

composer.command("deposit", async (ctx) => {
  const store = getDataStore();
  const userId = ctx.from?.id ?? 0;
  let user = await store.users.get(userId);
  if (!user) {
    user = {
      telegram_id: userId,
      display_name: ctx.from?.first_name ?? "User",
      balance: 0,
    };
    await store.users.set(userId, user);
    await store.users.addId(userId);
  }
  if (!user.solana_address) {
    user.solana_address = generateDepositAddress(userId);
    await store.users.set(userId, user);
  }
  const text =
    `💳 Deposit SOL to your bot balance.\n\n` +
    `Send SOL to this address:\n${user.solana_address}\n\n` +
    `Your balance will update after the deposit confirms on-chain.`;
  await ctx.reply(text, { reply_markup: backToMenu });
});

composer.callbackQuery("deposit:show", async (ctx) => {
  await ctx.answerCallbackQuery();
  const store = getDataStore();
  const userId = ctx.from?.id ?? 0;
  let user = await store.users.get(userId);
  if (!user) {
    user = {
      telegram_id: userId,
      display_name: ctx.from?.first_name ?? "User",
      balance: 0,
    };
    await store.users.set(userId, user);
    await store.users.addId(userId);
  }
  if (!user.solana_address) {
    user.solana_address = generateDepositAddress(userId);
    await store.users.set(userId, user);
  }
  const text =
    `💳 Deposit SOL to your bot balance.\n\n` +
    `Send SOL to this address:\n${user.solana_address}\n\n` +
    `Your balance will update after the deposit confirms on-chain.`;
  await ctx.editMessageText(text, { reply_markup: backToMenu });
});

export default composer;
