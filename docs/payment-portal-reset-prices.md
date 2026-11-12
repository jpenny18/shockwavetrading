# Reset checkout prices for the card payment portal

This is for the payment portal (scxdashboards / `PAYMENT_PORTAL_URL`). It shares the Shockwave Capital Firebase project. Card reset checkout fails when an admin sets a custom reset price because the portal still prices every reset as a hard-coded 20% off the list fee. The main site no longer does that.

Charge the resolved price. Do not recompute `listPrice * 0.80` and then reject the handoff when it differs.

## What the main site already sends

When a customer pays by card, the main site resolves the price on the server and POSTs it to:

`POST {PAYMENT_PORTAL_URL}/reset/api/handoff`

Header: `Authorization: Bearer {CHECKOUT_HANDOFF_SECRET}`

The body includes the amount to charge:

| Field | Meaning |
| --- | --- |
| `orderKind` | Always `account-reset` for this flow |
| `localOrderId` | Document id in Firestore `card-orders` |
| `idempotencyKey` | UUID for this checkout attempt |
| `userId` | Firebase Auth uid of the customer |
| `accountId` | Trading account id on `userMetaApiAccounts` |
| `resetCategory` | `challenge`, `funded`, or `vip` |
| `accountType` | `standard`, `1-step`, `instant`, `gauntlet`, or `vip` |
| `accountSize` | Number, for example `50000` or `1500000` |
| `accountStep` | `1`, `2`, `3`, or null. Step `3` means funded |
| `accountStatus` | Account status string, for example `active` or `funded` |
| `originalPrice` | List price in dollars, before any reset discount |
| `discountPercent` | Display percent only. It is not always 20, and it is not the formula to reapply |
| `expectedAmount` | Dollars to charge, already rounded to cents |
| `expectedAmountCents` | Integer cents to charge. This is the Stripe amount |
| `currency` | `usd` |

The same numbers are stored on `card-orders/{localOrderId}`:

- `totalAmount` = dollars
- `expectedAmountCents` = integer cents
- `originalPrice` = list price in dollars
- `discountPercent` = display percent
- `orderKind` = `account-reset`
- `userId`, `accountId`, `resetCategory`, `sourceAccountType`, `accountSize`

Create the Stripe charge for `expectedAmountCents`. Compare integers. A dollar float check such as `price !== expectedAmount` will reject valid cent-rounded prices.

`discountPercent` on the handoff is a label. For a fixed price of `$100` on a `$433.50` list fee, that field may be `77`. Multiplying the list price by `0.23` will not equal `$100`. Read the Firestore rule when you recompute. Use `expectedAmountCents` as the amount that must match.

## Why a custom price fails today

Built-in challenge and VIP resets are 20% off. Built-in funded resets are the full activation fee, with no discount. Admins can replace any of those with:

- a different percent off the list price, from 0 through 100
- a fixed dollar price

Those overrides can be global, for one customer and one challenge type/size, or for one trading account. The dashboard and the handoff both use the override. If the portal still requires `listPrice * 0.80`, the handoff's `expectedAmountCents` will not match and the card payment is rejected.

Crypto checkout on the main site already charges the resolved price. Only the card portal needs this change.

## Where the prices live in Firebase

One document:

```
collection: settings
document:   reset-prices
```

If the document does not exist, there are no overrides. Use the built-in prices below.

```json
{
  "global": {
    "challenge:standard:50000": { "mode": "discount", "discountPercent": 50 },
    "funded:*:100000": { "mode": "fixed", "price": 399 }
  },
  "users": {
    "FIREBASE_AUTH_UID": {
      "userId": "FIREBASE_AUTH_UID",
      "email": "trader@example.com",
      "displayName": "Trader Name",
      "catalog": {
        "challenge:1-step:10000": { "mode": "fixed", "price": 99 }
      },
      "accounts": {
        "THE_TRADING_ACCOUNT_ID": { "mode": "discount", "discountPercent": 40 }
      }
    }
  },
  "updatedAt": "2026-11-12T22:00:00.000Z",
  "updatedBy": "ADMIN_UID"
}
```

The portal should only read this document. Do not write it.

### Rule shape

A missing key means "no override at this layer".

```json
{ "mode": "discount", "discountPercent": 50 }
```

`discountPercent` is 0 through 100. `0` means charge the full list price. The percent is taken off the list price, not off the already-discounted built-in reset fee. A 50% rule on a `$433.50` list fee is `$216.75`, not 50% off the built-in `$346.80`.

```json
{ "mode": "fixed", "price": 100 }
```

`price` is dollars, already rounded to cents, from `0.50` through `100000`. Ignore percent for this mode and charge `price`.

Skip a rule when the resulting price is under `$0.50`. Fall through to the next layer. That is what the main site does, so a bad rule must not make the portal charge a different amount than the handoff.

### Catalog keys

Keys are strings. Funded resets do not vary by challenge type, so every funded account of that size shares one key.

| Product | Key |
| --- | --- |
| Challenge, Standard, $50,000 | `challenge:standard:50000` |
| Challenge, 1-Step, $10,000 | `challenge:1-step:10000` |
| Challenge, Instant, $5,000 | `challenge:instant:5000` |
| Challenge, Gauntlet, $25,000 | `challenge:gauntlet:25000` |
| Funded, any type, $100,000 | `funded:*:100000` |
| VIP, $1,000,000 | `vip:vip:1000000` |
| VIP, $1,500,000 | `vip:vip:1500000` |
| VIP, $2,000,000 | `vip:vip:2000000` |
| VIP, $3,000,000 | `vip:vip:3000000` |

Account-specific rules use the trading `accountId` as the map key inside `users.{uid}.accounts`. They are not catalog keys.

## Which rule wins

Look up the trading account, build the catalog key, then apply the first usable rule:

1. `settings/reset-prices.users.{userId}.accounts.{accountId}`
2. `settings/reset-prices.users.{userId}.catalog.{catalogKey}`
3. `settings/reset-prices.global.{catalogKey}`
4. Built-in price

`userId` is the Firebase Auth uid on the handoff, which is also `userMetaApiAccounts.userId`.

The account document is in `userMetaApiAccounts`. Find the doc whose `userId` equals the handoff user and whose `accountId` equals the handoff account. Read:

- `accountType`
- `accountSize`
- `status`
- `step`
- `profitSplit` (VIP only)
- `accountId`

Do not trust the handoff's category alone if you are recomputing. Derive the category from the account document with the rules in the next section. Then require your recomputed cents to equal `expectedAmountCents`.

## How to classify the account

Normalize `accountType` by trimming, lowercasing, and turning spaces and underscores into hyphens.

- `vip`, or a size above `500000`, is VIP.
- Otherwise `standard`, `instant`, `gauntlet`, and `1-step` / `1step` / `onestep` / `one-step` are challenge types.
- It is funded when `Number(step) === 3` or `status` is `funded`. A failed account with step `3` is still a funded reset.
- Otherwise it is a challenge reset.

VIP sizes are `1000000`, `1500000`, `2000000`, and `3000000`.

## Built-in list prices

These are `originalPrice`. They are not the amount to charge until a rule or the built-in discount is applied.

Challenge list prices, in dollars:

| Size | Standard | 1-Step | Instant | Gauntlet |
| --- | ---: | ---: | ---: | ---: |
| 5,000 | 88.50 | 97.50 | 448.50 | — |
| 10,000 | 163.50 | 178.50 | 823.50 | 19.99 |
| 25,000 | 283.50 | 298.50 | 1,123.50 | 19.99 |
| 50,000 | 433.50 | 433.50 | 1,348.50 | 19.99 |
| 100,000 | 748.50 | 853.50 | 2,698.50 | 19.99 |
| 200,000 | 1,423.50 | 1,483.50 | 5,248.50 | 19.99 |
| 500,000 | 2,848.50 | 2,998.50 | 10,498.50 | 19.99 |

Funded activation list prices. The built-in funded reset charges this full amount:

| Size | Dollars |
| --- | ---: |
| 10,000 | 199 |
| 25,000 | 299 |
| 50,000 | 499 |
| 100,000 | 799 |
| 200,000 | 1,499 |
| 500,000 | 2,999 |

VIP allocation list prices:

| Size | Dollars |
| --- | ---: |
| 1,000,000 | 5,499 |
| 1,500,000 | 7,499.50 |
| 2,000,000 | 9,999 |
| 3,000,000 | 14,999 |

`$1.5M` is half of the `$3M` list price (`14999 / 2`).

## Built-in charge when no rule matches

Use integer cents. Do not use `price * 0.8`.

```text
fullCents = Math.round(originalPrice * 100)

if percent is 0:
  chargeCents = fullCents
else:
  chargeCents = Math.round(fullCents * (100 - percent) / 100)

chargeDollars = chargeCents / 100
```

Built-in percents:

- Challenge reset: 20% off the challenge list price.
- VIP reset: 20% off the VIP list price, using the same cent formula.
- Funded reset: 0% off. Charge the activation price.

Examples with no overrides:

- Standard `$50,000` challenge: list `$433.50` → `43350` cents → 20% off → `34680` cents → `$346.80`.
- Funded `$50,000`: charge `$499.00` (`49900` cents). Not 20% off.
- VIP `$1,000,000`: list `$5,499` → 20% off → `$4,399.20`.

A global or per-user discount rule replaces that built-in percent. It is not stacked on top of the 20%.

## Recompute, then match the handoff

```text
account = userMetaApiAccounts doc for handoff.userId + handoff.accountId
base = built-in quote for that account
key = catalog key for base.category and base.accountSize
config = settings/reset-prices or empty maps

rule =
  config.users[userId].accounts[accountId]
  or config.users[userId].catalog[key]
  or config.global[key]
  or none

if rule exists and priceAfterRule(base.originalPrice, rule) >= 0.50:
  charge = that price
else:
  charge = base.price

require Math.round(charge * 100) === handoff.expectedAmountCents
require the same cents on card-orders/{localOrderId}.expectedAmountCents

stripe amount = that integer
```

`priceAfterRule`:

- `mode: "discount"` → the cent formula above, using the rule's `discountPercent`, applied to `originalPrice`.
- `mode: "fixed"` → `Math.round(rule.price * 100)`.

If the cents do not match, refuse the checkout. The customer should close the reset dialog and start again. Do not charge the 20% price instead.

## Worked custom prices

Standard `$50,000` challenge. List price `$433.50`. Built-in charge `$346.80`.

Global rule `challenge:standard:50000 = { mode: "discount", discountPercent: 50 }`:

- Charge `$216.75` (`21675` cents).
- A portal that requires 20% off will expect `$346.80` and reject the handoff.

Same account, plus `users.{uid}.catalog.challenge:standard:50000 = { mode: "fixed", price: 100 }`:

- The customer rule wins over global.
- Charge `$100.00` (`10000` cents).
- The handoff `discountPercent` might be `77`. Do not multiply `$433.50` by that percent.

Same customer, with `users.{uid}.accounts.{accountId} = { mode: "discount", discountPercent: 40 }` on one trading account only:

- That account charges 40% off `$433.50` = `$260.10` (`26010` cents).
- Their other `$50,000` Standard accounts still use the `$100` catalog rule.

## Portal change to make

In the reset handoff handler:

1. Keep accepting `expectedAmountCents` as the charge amount.
2. Remove any check that the reset price must equal 20% off the list price.
3. Verify `expectedAmountCents` with the Firebase lookup above before creating the Stripe session.
4. Put `expectedAmountCents` on the Stripe PaymentIntent / Checkout Session. Do not send `originalPrice` or a recomputed 20% figure to Stripe.
5. Leave `discountPercent` as metadata if you store it. Do not use it as the pricing formula.

No change is required on the main Shockwave Capital site for reset prices. It already stores the overrides in `settings/reset-prices` and already puts the resolved cents on the reset handoff and on `card-orders`.

## VIP allocation card handoff

Buying a VIP allocation from the Shockwave dashboard now collects the order on shockwave-capital.com. Card payment is handed to this portal. Crypto stays on the main site.

`POST {PAYMENT_PORTAL_URL}/vip/api/handoff`

Header: `Authorization: Bearer {CHECKOUT_HANDOFF_SECRET}`

This is a new purchase, not an account reset. Do not apply the reset 20% discount and do not read `settings/reset-prices`.

The amount to charge is `expectedAmountCents`. The main site already applied the same `discounts` collection used by `/challenge`, including a code marked `autoApply` in the admin discounts page.

| Field | Meaning |
| --- | --- |
| `orderKind` | `vip-allocation` |
| `idempotencyKey` | UUID for this attempt |
| `userId` | Firebase Auth uid |
| `challengeType` | `VIP Activation` |
| `challengeAmount` | `$1M`, `$2M`, or `$3M` |
| `tierName` | `Professional`, `Executive`, or `Institutional` |
| `platform` | `MT4` or `MT5` |
| `originalPrice` | List price in dollars: 5499, 9999, or 14999 |
| `discountCode` | Code from `discounts`, or empty |
| `discountId` | `discounts` document id, or empty |
| `discountType` | `percentage` or `fixed`, or empty |
| `discountValue` | Number, or null |
| `expectedAmount` | Dollars to charge after the discount |
| `expectedAmountCents` | Integer cents to charge |
| `currency` | `usd` |
| `firstName`, `lastName`, `email`, `phone`, `country`, `discordUsername` | Customer |
| `returnUrl` | `/dashboard/vip?vip=paid` on the main site |
| `cancelUrl` | `/dashboard/vip` on the main site |

Discount math, matching `/challenge`:

```text
if discountType is percentage:
  charge = roundToCents(originalPrice * (1 - discountValue / 100))
else if discountType is fixed:
  charge = roundToCents(max(0, originalPrice - discountValue))
else:
  charge = originalPrice

roundToCents(amount) = Math.round(amount * 100) / 100
```

A 10% code on the $5,499 Professional allocation charges $4,949.10 (`494910` cents), not 20% off and not the full $5,499.

Verify before creating the Stripe session:

1. `challengeAmount` is `$1M`, `$2M`, or `$3M`, and `originalPrice` is 5499, 9999, or 14999 for that level.
2. If `discountCode` is set, load `discounts` where `code` equals that code and `active` is true. Reject expired codes and codes whose `usageCount` has reached `usageLimit`.
3. Recompute the charge with the formula above.
4. Require the recomputed cents to equal `expectedAmountCents`.
5. Charge that integer. Increment `usageCount` on the discount document after a successful payment, the same way challenge card orders do.

Return `{ "checkoutUrl": "https://www.scxdashboards.com/..." }` from the handoff. The main site only redirects when that URL is on the payment portal host.
