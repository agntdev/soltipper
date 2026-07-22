# SOL Tip Bot — Bot specification

**Archetype:** finance

**Voice:** professional and concise — write every user-facing message, button label, error, and empty state in this voice.

A Telegram bot enabling anonymous SOL tipping within groups, with custodial deposit/withdrawal. Users send /tip <amount> in groups to tip others anonymously, deposit SOL to their bot balance, check balances privately, and withdraw to their Solana wallet. Admins monitor activity and approve large withdrawals.

> This is the complete contract for the bot. Implement EVERY entry point, flow, feature, integration, and edge case below. The completeness review checks the bot against this document after each build pass.

## Primary audience

- Telegram group chat users
- Solana cryptocurrency enthusiasts

## Success criteria

- Users can send anonymous SOL tips in groups without revealing sender identity
- Users receive real-time balance updates after deposits/withdrawals
- Admins receive alerts for withdrawals >10 SOL
- All transactions are auditable via persistent tip/deposit/withdrawal records

## Entry points

Every feature must be reachable from the bot's command/button surface (button-first; only /start and /help are slash commands).

- **/start** (command, actor: user, command: /start) — Open main menu with deposit/withdraw options
- **/tip** (command, actor: user, command: /tip) — Initiate anonymous tip in group chat
  - inputs: amount (SOL)
  - outputs: anonymous confirmation message
- **/balance** (command, actor: user, command: /balance) — Check private SOL balance
  - outputs: balance amount
- **/withdraw** (command, actor: user, command: /withdraw) — Request SOL withdrawal to linked address
  - inputs: amount, optional new address
  - outputs: withdrawal confirmation
- **/deposit** (command, actor: user, command: /deposit) — Get unique deposit address
  - outputs: deposit address + QR code
- **Admin Panel** (button, actor: admin, callback: admin:dashboard) — View totals and pending withdrawals
  - outputs: admin dashboard

## Flows

### Group Tip Flow
_Trigger:_ /tip <amount>

1. Validate reply context in group chat
2. Check sender balance >= requested amount
3. Prompt deposit if insufficient funds
4. Transfer SOL from sender to recipient balance
5. Post anonymous tip confirmation in group

_Data touched:_ User, Tip

### Withdrawal Flow
_Trigger:_ /withdraw

1. Verify user has linked Solana address
2. Validate withdrawal amount > 0
3. Create withdrawal request with network fee deduction
4. Send funds to user's address
5. Notify admin for >10 SOL withdrawals
6. Send status updates to user via DM

_Data touched:_ User, Withdrawal

## Data entities

Durable data (must survive a restart) uses the toolkit's persistent store, never in-memory maps.

- **User** _(retention: persistent)_ — Telegram user profile with Solana integration
  - fields: telegram_id, display_name, solana_address, balance, last_deposit_ts
- **Tip** _(retention: persistent)_ — Anonymous group tip transaction record
  - fields: amount, timestamp, sender_id, recipient_id, group_id, message_id
- **Withdrawal** _(retention: persistent)_ — Processed or pending withdrawal request
  - fields: amount, status, network_fee, target_address, timestamp

## Integrations

- **Telegram** (required) — Bot API messaging and group monitoring
- **Solana Blockchain** (required) — Custodial wallet for deposits/withdrawals
Call external APIs against their real contract (correct endpoints, ids, params); credentials from env. Do not fake responses.

## Owner controls

- Configure admin notification chat ID
- Pause/resume tipping in specific groups
- View withdrawal queue and approve large transactions
- Set platform fee percentage (default 0%)

## Notifications

- Withdrawal status updates to user DMs
- Admin alerts for >10 SOL withdrawals
- Error notifications for failed transactions

## Permissions & privacy

- All tip sender IDs stored but never displayed publicly
- User balances only visible to the user
- Custodial keys stored in secure environment variables
- Withdrawal addresses verified via cryptographic signature

## Edge cases

- User tries to tip without sufficient balance
- Invalid Solana address in withdrawal request
- Network failure during on-chain transaction
- Multiple simultaneous withdrawal requests

## Required tests

- End-to-end tip flow in group chat with balance updates
- Withdrawal processing with network fee deduction
- Admin alert triggering for large withdrawals
- Anonymous tip notification formatting in groups

## Assumptions

- Users have basic Solana wallet knowledge
- Admin will configure custodial wallet during setup
- Telegram group admins will enforce bot rules
