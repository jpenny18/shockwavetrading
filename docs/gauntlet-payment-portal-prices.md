# Gauntlet checkout prices for the payment portal

Paste this to the payment portal agent. These are the amounts Shockwave now sends, or expects the portal to charge. Do not apply Black Friday, promo codes, or any other discount to a Gauntlet challenge.

## 1. Gauntlet challenge — card checkout

Used by `https://shockwave-capital.com/challenge` when the shopper selects Gauntlet.

The site posts to the existing checkout handoff:

- `challengeType`: `Gauntlet`
- `challengeAmount`: `$10,000`, `$25,000`, `$50,000`, `$100,000`, `$200,000`, or `$500,000`
- `expectedAmount`: `1`
- `discountCode`: empty string
- `addOns`: empty array
- `platform`: `MT4` or `MT5`

Charge **$1.00 USD** for every size. Reject any discount, including an automatic Black Friday code. Crypto is not offered for this product.

Activation fees below are not part of this charge. They are paid later, only after the trader passes.

| Account size | Card charge now | Activation fee later |
| --- | ---: | ---: |
| $10,000 | $1.00 | $199 |
| $25,000 | $1.00 | $349 |
| $50,000 | $1.00 | $599 |
| $100,000 | $1.00 | $999 |
| $200,000 | $1.00 | $1,899 |
| $500,000 | $1.00 | $4,499 |

## 2. Gauntlet activation — after a pass

Page: `https://shockwave-capital.com/gauntlet-activation`

Order field `challengeType`: `gauntlet-activation`

This is the fee to activate the funded account after the $1 challenge is passed. Charge the list price. Do not apply the old 50% Black Friday discount.

| Account | List price charged |
| --- | ---: |
| $10k | $199 |
| $25k | $349 |
| $50k | $599 |
| $100k | $999 |
| $200k | $1,899 |
| $500k | $4,499 |

A reset of this same product, only when the site sends `activationMode: "reset"`, is 12% off that list price.

## 3. Activate Funded — direct to funded

Page: `https://shockwave-capital.com/funded-activation`

Order field `challengeType`: `activate-funded`

This is a separate direct-to-funded product. It keeps the previous list prices and the 50% discount. The amount to charge is the discounted price.

| Account | List price | Charge now |
| --- | ---: | ---: |
| $10k | $349 | $174.50 |
| $25k | $699 | $349.50 |
| $50k | $1,299 | $649.50 |
| $100k | $2,499 | $1,249.50 |
| $200k | $4,999 | $2,499.50 |
| $500k | $11,999 | $5,999.50 |

Do not use these Activate Funded prices for `challengeType: "Gauntlet"` or `challengeType: "gauntlet-activation"`.

## What not to change

Standard, 1-Step, Instant, and VIP checkout prices stay as they are. Only the three Gauntlet products above change.
