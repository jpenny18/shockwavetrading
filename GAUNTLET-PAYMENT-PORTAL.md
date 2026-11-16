# Gauntlet checkout prices for the payment portal

Update the payment portal so these products charge the amounts below. The marketing site sends the amount in `expectedAmount`. If the portal price does not match, card checkout is rejected.

The site forwards card checkout with:

`POST {PAYMENT_PORTAL_URL}/checkout/api/handoff`

Authorization: `Bearer {CHECKOUT_HANDOFF_SECRET}`

## 1. Gauntlet challenge — card checkout

This is the $1 evaluation. It is used by `/challenge` when the shopper selects Gauntlet.

Do not apply Black Friday, automatic discounts, or coupon codes to this product. The site now sends an empty `discountCode` and does not reduce the price.

`expectedAmount` is always `1` (one US dollar), for every account size.

| Field | Value |
| --- | --- |
| `challengeType` | `Gauntlet` |
| `challengeAmount` | `$10,000`, `$25,000`, `$50,000`, `$100,000`, `$200,000`, or `$500,000` |
| `expectedAmount` | `1` |
| `platform` | `MT4` or `MT5` |
| `addOns` | Optional free add-ons from `/challenge`. They must not change the $1 price. |
| `discountCode` | `""` |

Account sizes and the portal price:

| Account size sent as `challengeAmount` | Charge |
| --- | --- |
| `$10,000` | $1.00 |
| `$25,000` | $1.00 |
| `$50,000` | $1.00 |
| `$100,000` | $1.00 |
| `$200,000` | $1.00 |
| `$500,000` | $1.00 |

Crypto is turned off for this product on `/challenge`. Card is the only Gauntlet challenge payment method.

The activation fee is not charged in this checkout. It is paid later, only after the trader passes.

## 2. Gauntlet activation — pay after passing

Route: `/gauntlet-activation`

This is a different product from the $1 challenge. These are the full prices. Do not apply the 50% Black Friday discount. A reset, when that option is enabled, is 12% off the price in this table.

The live payment method on the site is crypto, charged by the site itself. The hidden card button still points at the old Whop plans, which do not match these prices. If the portal takes over card payment for this product, charge the amounts below and ignore the old Whop plan prices.

| Account | List price | Reset price (12% off) |
| --- | --- | --- |
| $10,000 | $199 | $175.12 |
| $25,000 | $349 | $307.12 |
| $50,000 | $599 | $527.12 |
| $100,000 | $999 | $879.12 |
| $200,000 | $1,899 | $1,671.12 |
| $500,000 | $4,499 | $3,959.12 |

Order fields the site stores for this product:

| Field | Value |
| --- | --- |
| `challengeType` | `gauntlet-activation` |
| `challengeAmount` | `$10k`, `$25k`, `$50k`, `$100k`, `$200k`, or `$500k` |
| `activationMode` | `activate` or `reset` |
| `totalAmount` | The price from the table above |

## 3. Direct to funded — `/funded-activation`

This keeps the previous direct-to-funded price list. Activate is 50% off. Reset, when enabled, is 12% off the list price, not off the already discounted price.

| Account | List price | Activate price (50% off) | Reset price (12% off list) |
| --- | --- | --- | --- |
| $10,000 | $349 | $174.50 | $307.12 |
| $25,000 | $699 | $349.50 | $615.12 |
| $50,000 | $1,299 | $649.50 | $1,143.12 |
| $100,000 | $2,499 | $1,249.50 | $2,199.12 |
| $200,000 | $4,999 | $2,499.50 | $4,399.12 |
| $500,000 | $11,999 | $5,999.50 | $10,559.12 |

| Field | Value |
| --- | --- |
| `challengeType` | `activate-funded` |
| `challengeAmount` | `$10k`, `$25k`, `$50k`, `$100k`, `$200k`, or `$500k` |
| `activationMode` | `activate` or `reset` |
| `totalAmount` | The activate or reset price from the table above |

Do not use these direct-to-funded prices for `challengeType: "Gauntlet"`. That type is only the $1 challenge.
