import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard, confirmKeyboard } from "../toolkit/index.js";
import { getDataStore } from "../bot.js";

const NETWORK_FEE = 0.00025;

const composer = new Composer<Ctx>();

const backToMenu = inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]);

async function handleWithdrawStart(ctx: Ctx): Promise<void> {
  const store = getDataStore();
  const user = await store.users.get(ctx.from?.id ?? 0);
  const balance = user?.balance ?? 0;

  if (balance <= 0) {
    const text = "📤 Withdraw SOL\n\nNo funds to withdraw. Tap 💳 Deposit to add SOL first.";
    if ("callback_query" in (ctx.update ?? {})) {
      await ctx.editMessageText(text, { reply_markup: backToMenu });
    } else {
      await ctx.reply(text, { reply_markup: backToMenu });
    }
    return;
  }

  if (!user?.solana_address) {
    const text = "📤 Withdraw SOL\n\nYou need to set a withdrawal address first.\nTap 💳 Deposit to generate your Solana address, then come back.";
    if ("callback_query" in (ctx.update ?? {})) {
      await ctx.editMessageText(text, { reply_markup: backToMenu });
    } else {
      await ctx.reply(text, { reply_markup: backToMenu });
    }
    return;
  }

  ctx.session.step = "withdraw_awaiting_amount";
  ctx.session.withdrawAddress = user.solana_address;
  const text = `📤 Withdraw SOL\n\nBalance: ${balance.toFixed(4)} SOL\nNetwork fee: ${NETWORK_FEE} SOL\nDestination: ${user.solana_address}\n\nHow much SOL do you want to withdraw?`;
  if ("callback_query" in (ctx.update ?? {})) {
    await ctx.editMessageText(text, {
      reply_markup: inlineKeyboard([[inlineButton("Cancel", "withdraw:cancel")]]),
    });
  } else {
    await ctx.reply(text, {
      reply_markup: inlineKeyboard([[inlineButton("Cancel", "withdraw:cancel")]]),
    });
  }
}

composer.command("withdraw", async (ctx) => {
  await handleWithdrawStart(ctx);
});

composer.callbackQuery("withdraw:show", async (ctx) => {
  await ctx.answerCallbackQuery();
  await handleWithdrawStart(ctx);
});

composer.callbackQuery("withdraw:cancel", async (ctx) => {
  await ctx.answerCallbackQuery();
  ctx.session.step = "idle";
  ctx.session.withdrawAddress = undefined;
  ctx.session.withdrawAmount = undefined;
  await ctx.editMessageText("Withdrawal cancelled.", { reply_markup: backToMenu });
});

composer.on("message:text", async (ctx, next) => {
  if (ctx.session.step !== "withdraw_awaiting_amount") return next();

  const text = ctx.message.text.trim();
  if (text === "/cancel" || text.toLowerCase() === "cancel") {
    ctx.session.step = "idle";
    await ctx.reply("Withdrawal cancelled. Tap /start to begin again.");
    return;
  }

  const amount = parseFloat(text);
  if (isNaN(amount) || amount <= 0) {
    await ctx.reply("Enter a valid amount greater than 0.\nExample: 1.5");
    return;
  }

  const store = getDataStore();
  const user = await store.users.get(ctx.from?.id ?? 0);
  const balance = user?.balance ?? 0;
  const totalDeduction = amount + NETWORK_FEE;

  if (totalDeduction > balance) {
    await ctx.reply(
      `Insufficient balance. You have ${balance.toFixed(4)} SOL (including ${NETWORK_FEE} SOL network fee).\nTry a smaller amount.`,
    );
    return;
  }

  ctx.session.withdrawAmount = amount;
  ctx.session.step = "withdraw_confirming";

  await ctx.reply(
    `Confirm withdrawal:\n\n` +
      `Amount: ${amount.toFixed(4)} SOL\n` +
      `Network fee: ${NETWORK_FEE} SOL\n` +
      `Total deducted: ${totalDeduction.toFixed(4)} SOL\n` +
      `To: ${ctx.session.withdrawAddress}\n\n` +
      `Proceed?`,
    { reply_markup: confirmKeyboard("withdraw:confirm") },
  );
});

composer.callbackQuery("withdraw:confirm:yes", async (ctx) => {
  await ctx.answerCallbackQuery();
  if (ctx.session.step !== "withdraw_confirming") {
    await ctx.reply("No pending withdrawal. Tap /start to begin again.");
    return;
  }

  const store = getDataStore();
  const user = await store.users.get(ctx.from?.id ?? 0);
  if (!user) {
    await ctx.reply("Account not found. Tap /start to begin again.");
    ctx.session.step = "idle";
    return;
  }

  const amount = ctx.session.withdrawAmount ?? 0;
  const address = ctx.session.withdrawAddress ?? "";
  const totalDeduction = amount + NETWORK_FEE;

  user.balance -= totalDeduction;
  await store.users.set(ctx.from?.id ?? 0, user);

  const wdId = Date.now();
  await store.withdrawals.set(wdId, {
    id: String(wdId),
    amount,
    status: amount > 10 ? "pending" : "completed",
    network_fee: NETWORK_FEE,
    target_address: address,
    timestamp: wdId,
    user_id: ctx.from?.id ?? 0,
  });
  await store.withdrawals.addId(wdId);

  ctx.session.step = "idle";
  ctx.session.withdrawAddress = undefined;
  ctx.session.withdrawAmount = undefined;

  const statusMsg =
    amount > 10
      ? "This withdrawal requires admin approval due to the amount (>10 SOL). You'll be notified once it's processed."
      : "Your withdrawal has been submitted and will be processed shortly.";

  await ctx.editMessageText(
    `✅ Withdrawal submitted!\n\n` +
      `Amount: ${amount.toFixed(4)} SOL\n` +
      `To: ${address}\n\n` +
      statusMsg,
    { reply_markup: backToMenu },
  );
});

composer.callbackQuery("withdraw:confirm:no", async (ctx) => {
  await ctx.answerCallbackQuery();
  ctx.session.step = "idle";
  ctx.session.withdrawAddress = undefined;
  ctx.session.withdrawAmount = undefined;
  await ctx.editMessageText("Withdrawal cancelled.", { reply_markup: backToMenu });
});

export default composer;
