import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard } from "../toolkit/index.js";
import { getDataStore } from "../bot.js";

const composer = new Composer<Ctx>();

const TIP_INSTRUCTIONS =
  "🎯 Anonymous Tipping\n\n" +
  "To tip someone in a group chat:\n" +
  "1. Reply to their message with /tip <amount>\n" +
  "   Example: /tip 0.5\n\n" +
  "The tip is anonymous — the recipient won't see who sent it.";

const backToMenu = inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]);

composer.callbackQuery("tip:start", async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.editMessageText(TIP_INSTRUCTIONS, { reply_markup: backToMenu });
});

composer.command("tip", async (ctx) => {
  const from = ctx.from;
  if (!from) return;

  if (!ctx.chat || ctx.chat.type === "private") {
    await ctx.reply(
      "Tipping only works in group chats. Use /tip <amount> in a group, replying to someone's message.",
    );
    return;
  }

  const replyTo = ctx.message?.reply_to_message;
  if (!replyTo?.from || replyTo.from.is_bot) {
    await ctx.reply("Reply to someone's message with /tip <amount> to tip them.");
    return;
  }

  if (replyTo.from.id === from.id) {
    await ctx.reply("You can't tip yourself.");
    return;
  }

  const parts = (ctx.message?.text ?? "").trim().split(/\s+/);
  const amountStr = parts[1];
  if (!amountStr) {
    await ctx.reply("Specify an amount: /tip <amount>\nExample: /tip 0.5");
    return;
  }

  const amount = parseFloat(amountStr);
  if (isNaN(amount) || amount <= 0) {
    await ctx.reply("Enter a valid amount greater than 0.\nExample: /tip 0.5");
    return;
  }

  const store = getDataStore();
  const sender = await store.users.get(from.id);
  if (!sender) {
    await ctx.reply("Account not found. Tap /start to set up your account.");
    return;
  }

  const senderBalance = sender.balance ?? 0;
  if (senderBalance < amount) {
    await ctx.reply(
      `Insufficient balance. You have ${senderBalance.toFixed(4)} SOL.\n` +
        "Tap 💳 Deposit to add funds first.",
    );
    return;
  }

  let recipient = await store.users.get(replyTo.from.id);
  if (!recipient) {
    recipient = {
      telegram_id: replyTo.from.id,
      display_name: replyTo.from.first_name ?? "User",
      balance: 0,
    };
    await store.users.set(replyTo.from.id, recipient);
    await store.users.addId(replyTo.from.id);
  }

  sender.balance -= amount;
  recipient.balance += amount;
  await store.users.set(from.id, sender);
  await store.users.set(replyTo.from.id, recipient);

  const tipId = Date.now();
  await store.tips.set(tipId, {
    id: String(tipId),
    amount,
    timestamp: tipId,
    sender_id: from.id,
    recipient_id: replyTo.from.id,
    group_id: ctx.chat.id,
  });
  await store.tips.addId(tipId);

  await ctx.reply(`✅ Tipped ${amount.toFixed(4)} SOL anonymously!`);
});

export default composer;
