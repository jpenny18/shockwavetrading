# Build an integration with an embedded form

The following guide describes how to use the embedded form with *Checkout Sessions* (A Checkout Session represents your customer's session as they pay for one-time purchases or subscriptions through Checkout. After a successful payment, the Checkout Session contains a reference to the Customer, and either the successful PaymentIntent or an active Subscription).

You can also build and preview your embedded Checkout form through [Checkout studio](https://docs.stripe.com/payments/checkout-studio.md), which provides a centralized Dashboard page for configuring and monitoring your Checkout integrations.

## Set up Stripe [Server-side]

First, [create a Stripe account](https://dashboard.stripe.com/register) or [sign in](https://dashboard.stripe.com/login).

Coding agents should install the Stripe CLI (`npm i -g @stripe/cli`) and run the command `stripe sandbox create --help` to provision an anonymous Stripe sandbox with working API keys. No account registration required.

Use our official libraries to access the Stripe API from your application:

#### Ruby

```bash
# Available as a gem
sudo gem install stripe
```

```ruby
# If you use bundler, you can add this line to your Gemfile
gem 'stripe'
```

## Enable payment methods

By default, Stripe uses your [payment methods settings](https://dashboard.stripe.com/settings/payment_methods) to determine which payment methods the embedded form presents. You can also configure specific payment methods on your Checkout Session using the [payment_method_types](https://docs.stripe.com/api/checkout/sessions/create.md#create_checkout_session-payment_method_types) attribute.

## Create a Checkout Session [Server-side]

Create a Checkout Session on your server to control the payment flow. The Checkout Session defines your line items, shipping options, and other settings for the payment.

```curl
curl https://api.stripe.com/v1/checkout/sessions \
  -u "<<YOUR_SECRET_KEY>>:" \
  -d "line_items[0][price]={{PRICE_ID}}" \
  -d "line_items[0][quantity]=1" \
  -d mode=payment \
  -d ui_mode=form \
  -d return_url={{RETURN_URL}} \
  -d integration_identifier=embedded_web_0001
```

Set `ui_mode` to `form` to integrate with the embedded form. The returned `CheckoutSession` object includes a client secret, which the client uses to securely display the checkout interface.

The Checkout Sessions API supports an optional `integration_identifier` parameter you can set when creating a session. Use it to label this form integration with a recognizable name and measure its conversion independently from other Checkout integrations you run.

You can also configure the following options on the [CheckoutSession](https://docs.stripe.com/api/checkout/sessions/create.md):

- [automatic_tax](https://docs.stripe.com/api/checkout/sessions/create.md#create_checkout_session-automatic_tax): Enable automatic tax calculation
- [automatic_tax[address_collection_precision]](https://docs.stripe.com/payments/checkout/taxes.md?payment-ui=checkout-form): Control billing address collection in embedded forms for tax calculation when automatic tax is enabled
- [billing_address_collection](https://docs.stripe.com/api/checkout/sessions/create.md#create_checkout_session-billing_address_collection): Collect billing addresses
- [customer_email](https://docs.stripe.com/api/checkout/sessions/create.md#create_checkout_session-customer_email): Prefill the customer’s email address
- [customer](https://docs.stripe.com/api/checkout/sessions/create.md#create_checkout_session-customer): Prefill customer data from an existing `Customer` object
- [name_collection](https://docs.stripe.com/api/checkout/sessions/create.md#create_checkout_session-name_collection): Collect your customers’ business name, individual name, or both
- [shipping_address_collection](https://docs.stripe.com/api/checkout/sessions/create.md#create_checkout_session-shipping_address_collection): Collect shipping addresses
- [shipping_options](https://docs.stripe.com/api/checkout/sessions/create.md#create_checkout_session-shipping_options): Provide shipping rate options
- [submit_type](https://docs.stripe.com/api/checkout/sessions/create.md#create_checkout_session-submit_type): Specify the type of transaction being performed
- [phone_number_collection](https://docs.stripe.com/api/checkout/sessions/create.md#create_checkout_session-phone_number_collection): Collect your customer’s phone number
- [tax_id_collection](https://docs.stripe.com/api/checkout/sessions/create.md#create_checkout_session-tax_id_collection): Collect tax IDs
- [allow_promotion_codes](https://docs.stripe.com/api/checkout/sessions/create.md#create_checkout_session-allow_promotion_codes): Allow customer-redeemable promotion codes

> #### Unsupported CheckoutSession parameters
> 
> The embedded form doesn’t support `consent_collection`.

## Set up Stripe Elements [Client-side]

#### React

The embedded form is available as a feature of Stripe.js. Install [React Stripe.js](https://www.npmjs.com/package/@stripe/react-stripe-js) and the [Stripe.js loader](https://www.npmjs.com/package/@stripe/stripe-js) from the npm public registry.

```bash
npm install --save @stripe/react-stripe-js @stripe/stripe-js
```

Create `clientSecret` as a `Promise<string> | string` containing the client secret returned by your server. Wrap your application with the [CheckoutFormProvider](https://docs.stripe.com/js/react_stripe_js/checkout_form/checkout_form_provider) component, passing in `clientSecret` and the `stripe` instance.

```jsx
import React, {useMemo} from 'react';
import {CheckoutFormProvider, CheckoutForm} from '@stripe/react-stripe-js/checkout';
import {loadStripe} from '@stripe/stripe-js';

const stripePromise = loadStripe('<<YOUR_PUBLISHABLE_KEY>>');

const App = () => {
  const clientSecret = useMemo(() => (
    fetch('/create-checkout-session', {method: 'POST'})
      .then((response) => response.json())
      .then((json) => json.client_secret)
  ), []);

  return (
    <CheckoutFormProvider
      stripe={stripePromise}
      options={{clientSecret}}
    >
      <CheckoutForm />
    </CheckoutFormProvider>
  );
};

export default App;
```

#### HTML + JS

The embedded form is automatically available as a feature of Stripe.js. Include the Stripe.js script on your checkout page by adding it to the head of your HTML file. Always load Stripe.js directly from js.stripe.com to remain PCI compliant. Don’t include the script in a bundle or host a copy of it yourself.

```html
<head>
  <title>Checkout</title>
  <script src="https://js.stripe.com/endive/stripe.js"></script>
</head>
```

Create an instance of Stripe on your checkout page:

```javascript
const stripe = Stripe('<<YOUR_PUBLISHABLE_KEY>>');
```

Fetch the client secret from your server and initialize the Checkout Form SDK:

```javascript
const clientSecret = fetch('/create-checkout-session', {method: 'POST'})
  .then((response) => response.json())
  .then((json) => json.client_secret);
```

Create the Checkout Form SDK instance:

```javascript
const checkout = stripe.initCheckoutFormSdk({
  clientSecret
});
```

## Create and mount [Client-side]

The embedded form contains an iframe that securely sends the payment information to Stripe over an HTTPS connection.

#### React

The `CheckoutForm` component is already rendered inside `CheckoutFormProvider` in the previous step. No additional mounting is required for React.

#### HTML + JS

The embedded form needs a designated place on your payment page. Create an empty DOM node (container) with a unique ID in your payment form.

```html
<div id="checkout-form">
  <!-- embedded form will be inserted here -->
</div>
```

When the Checkout Form SDK instance is ready, create the embedded form and mount it to the container DOM node:

```javascript
const form = checkout.createForm();
form.mount('#checkout-form');
```

You can specify the [layout](https://docs.stripe.com/js/custom_checkout/create_form#custom_checkout_create_form-options-layout) to render the embedded form as a single-step or multi-step embedded form.

## Prefill customer email

You can prefill the customer’s email address using one of two approaches, depending on whether you want the email to be editable.

### Set the email on the Checkout Session (non-editable) 

Pass [customer_email](https://docs.stripe.com/api/checkout/sessions/create.md#create_checkout_session-customer_email) when creating the Checkout Session on your server. The email is displayed in the embedded form but the customer can’t change it. You can also pass a [Customer](https://docs.stripe.com/api/customers.md) ID to the [customer](https://docs.stripe.com/api/checkout/sessions/create.md#create_checkout_session-customer) field to prefill the email stored on the Customer.

### Set a default email on the client (editable) 

Pass `defaultValues.email` when initializing the SDK to prefill an editable email. The customer can modify this value in the embedded form.

#### React

```jsx
<CheckoutFormProvider
  stripe={stripePromise}
  options={{
    clientSecret,
    defaultValues: {
      email: 'customer@example.com',
    },
  }}
>
  <CheckoutForm />
</CheckoutFormProvider>
```

#### HTML + JS

```javascript
const checkout = stripe.initCheckoutFormSdk({
  clientSecret,
  defaultValues: {
    email: 'customer@example.com',
  },
});
```

## Finalize payment [Client-side]

The Checkout Session you created on the server automatically determines the line items, total amount, and available payment methods. The embedded form uses this information to display the appropriate interface.

#### React

### Handle payment confirmation 

Handle the confirm event when your customer finalizes their payment:

```jsx
import React, {useMemo} from 'react';
import {CheckoutFormProvider, CheckoutForm, useCheckoutForm} from '@stripe/react-stripe-js/checkout';
import {loadStripe} from '@stripe/stripe-js';

const stripePromise = loadStripe('<<YOUR_PUBLISHABLE_KEY>>');

const CheckoutPage = () => {
  const checkoutState = useCheckoutForm();

  if (checkoutState.type === 'error') {
    return <div>Error: {checkoutState.error.message}</div>;
  }

  const onConfirm = (event) => {
    if (checkoutState.type === 'success') {
       checkoutState.checkout.confirm({formConfirmEvent: event});
    }
  };

  return <CheckoutForm onConfirm={onConfirm} />;
};

const App = () => {
  const clientSecret = useMemo(() => (
    fetch('/create-checkout-session', {method: 'POST'})
      .then((response) => response.json())
      .then((json) => json.client_secret)
  ), []);

  return (
    <CheckoutFormProvider
      stripe={stripePromise}
      options={{clientSecret}}
    >
      <CheckoutPage />
    </CheckoutFormProvider>
  );
};

export default App;
```

### Handle errors 

The embedded form automatically shows localized customer-facing error messages during client confirmation. If a problem prevents the confirm method from continuing, the confirm method can raise an exception. Catch and handle those exceptions.

```jsx
const onConfirm = async (event) => {
  if (checkoutState.type === 'success') {
    try {
      await checkoutState.checkout.confirm({formConfirmEvent: event});
    } catch (error) {
      console.error('Payment confirmation error:', error);
    }
  }
};
```

#### HTML + JS

### Handle payment confirmation 

Listen to the confirm event when your customer finalizes their payment:

```javascript
const loadActionsResult = await checkout.loadActions();
if (loadActionsResult.type === 'success') {
  form.on('confirm', (event) => {
    loadActionsResult.actions.confirm({formConfirmEvent: event});
  });
}
```

The embedded form automatically shows localized customer-facing error messages during client confirmation. If an immediate problem prevents the confirm method from continuing, the confirm method can raise an exception. Catch and handle those exceptions.

```javascript
const loadActionsResult = await checkout.loadActions();
if (loadActionsResult.type === 'success') {
  form.on('confirm', async (event) => {
    try {
      await loadActionsResult.actions.confirm({formConfirmEvent: event});
    } catch (error) {
      console.error('Payment confirmation error:', error);
    }
  });
}
```

> #### Customize redirect behavior
> 
> By default, after a successful payment, the embedded form redirects your customer to the `return_url` that you specify when you create the Checkout Session. To prevent redirects for payment methods that don’t require a redirect, such as cards, set [redirect](https://docs.stripe.com/js/custom_checkout/confirm#custom_checkout_session_confirm-options-redirect) to `'if_required'` when calling [confirm](https://docs.stripe.com/js/custom_checkout/confirm). To learn more, see [Customize redirect behavior](https://docs.stripe.com/payments/checkout/custom-success-page.md?payment-ui=checkout-form).

## Handle post-payment events [Server-side]

The Checkout Session defines your line items, shipping options, and other settings for the payment. After a customer confirms payment on the client, handle the result on your server rather than relying on client-side state.

- **Webhooks** (Recommended): Listen for the [checkout.session.completed](https://docs.stripe.com/api/events/types.md#event_types-checkout.session.completed) event, which Stripe sends when the payment succeeds. This approach ensures you’re notified even if the customer closes their browser before the redirect.
- **Return page**: [Retrieve the Checkout Session](https://docs.stripe.com/api/checkout/sessions/retrieve.md) using its ID to check the payment status and show the appropriate result to your customer on the page you set as the `return_url`.

Learn how to [fulfill orders](https://docs.stripe.com/checkout/fulfillment.md?payment-ui=checkout-form) after receiving a payment.

## Test the integration

Before you go live, [test](https://docs.stripe.com/testing.md) each payment method integration. Click **Pay** to complete the payment, which redirects you to the specified return page.

If you see the return page, and the payment appears in the list of successful payments in the Dashboard, your integration is working.

#### Cards

Use Stripe’s [test card numbers](https://docs.stripe.com/testing.md#cards) to test card payments. For example:

| Scenario | Card Number |
| --- | --- |
| Payment succeeds | 4242424242424242 |
| Payment requires 3DS authentication | 4000002500003155 |
| Payment is declined | 4000000000009995 |

#### One-click payment buttons

Follow these steps to test one-click payment buttons:

1. Add a payment method to your browser. For example, you can add a card to your Google Pay account or to your Apple Wallet.
2. Serve your application over HTTPS. This is required in development and in production. You can use a service such as [ngrok](https://ngrok.com/).
3. [Register your domain](https://dashboard.stripe.com/settings/payment_method_domains) in both a *sandbox* (A sandbox is an isolated test environment that allows you to test Stripe functionality in your account without affecting your live integration. Use sandboxes to safely experiment with new features and changes) and live mode.
4. Follow the instructions in the [Express Checkout Element testing guide](https://docs.stripe.com/elements/express-checkout-element/accept-a-payment.md?payment-ui=embedded-components#test-integration).

## Customize the layout and appearance 

You can customize the embedded form by setting its options or by using the Appearance API.

### Layout 

Use the [layout](https://docs.stripe.com/js/custom_checkout/create_form#custom_checkout_create_form-options-layout) option to control how the embedded form presents checkout steps.

- **Expanded**: Use this layout for a single-step checkout. It’s ideal for traditional checkout forms that sit directly on the web page.
- **Compact** (Private preview): Use this layout for multi-step checkout. It’s ideal for more compact UI layouts like modals, popups, and chat UIs.

When you leave `layout` undefined, Stripe renders the layout it determines has the best conversion.

### Request access to the compact layout

The compact layout displays the embedded form as a multi-step checkout flow. It's available by request in private preview. Enter your email address below to request access.

```bash
curl https://docs.stripe.com/preview/register \
  -X POST \
  -H "Content-Type: application/json" \
  -H "Referer: https://docs.stripe.com/checkout/form/quickstart" \
  -d '{"email": "EMAIL", "preview": "elements_betas_preview"}'
```

#### React

```jsx
const checkoutFormOptions = {
  layout: 'expanded',
};

<CheckoutForm
  options={checkoutFormOptions}
  onConfirm={onConfirm}
/>
```

#### HTML + JS

```javascript
const form = checkout.createForm({
  layout: 'expanded',
});

form.mount('#checkout-form');
```

### Embedded form options 

You can configure the appearance of each express payment method button and pass saved contacts using options.

#### React

```jsx
const checkoutFormOptions = {
  expressCheckout: {
    buttonTheme: {
      applePay: 'white-outline'
    },
    paymentMethods: {
      applePay: 'always'
    }
  }
};

<CheckoutForm
  options={checkoutFormOptions}
  onConfirm={onConfirm}
/>
```

#### HTML + JS

```javascript
const form = checkout.createForm({
  expressCheckout: {
    buttonTheme: {
      applePay: 'white-outline'
    },
    paymentMethods: {
      applePay: 'always'
    }
  }
});

form.mount('#checkout-form');
```

The embedded form supports the following options:

|  |
| `expressCheckout.buttonTheme` | Specify a theme per one-click payment button. See [buttonTheme](https://docs.stripe.com/js/custom_checkout/create_form#custom_checkout_create_form-options-expressCheckout-buttonTheme). |
| `expressCheckout.paymentMethods` | Specify which one-click payment buttons show. See [paymentMethods](https://docs.stripe.com/js/custom_checkout/create_form#custom_checkout_create_form-options-expressCheckout-paymentMethods). |
| `contacts` | An array of objects representing saved addresses, each containing `name`, `address`, and `phone` properties. See [contacts](https://docs.stripe.com/js/custom_checkout/create_form#custom_checkout_create_form-options-contacts). |

### Appearance API 

You can use the [Appearance API](https://docs.stripe.com/elements/appearance-api.md) to control the style of the embedded form by applying a theme or updating specific details. However, the embedded form doesn’t support the `rules` option.

For instance, choose the “flat” theme and override the primary text color.

#### React

```jsx
const appearance = {
  theme: 'flat',
  variables: { colorPrimaryText: '#262626' }
};

<CheckoutFormProvider
  stripe={stripePromise}
  options={{
    clientSecret, // In a working integration, your back end passes this hash containing details such as the amount of a payment. See the full sample for details.
    appearance
  }}
>
  <CheckoutForm />
</CheckoutFormProvider>
```

#### HTML + JS

```javascript
const appearance = {
  theme: 'flat',
  variables: { colorPrimaryText: '#262626' }
};

const checkout = stripe.initCheckoutFormSdk({
  clientSecret, // In a working integration, your back end passes this hash containing details such as the amount of a payment. See the full sample for details.
  appearance
});
```

## Disclose Stripe to your customers 

Stripe collects information on customer interactions with Elements to provide services to you, prevent fraud, and improve its services. This includes using cookies and IP addresses to identify which Elements a customer saw during a single checkout session. You’re responsible for disclosing and obtaining all rights and consents necessary for Stripe to use data in these ways. For more information, visit our [privacy center](https://stripe.com/legal/privacy-center#as-a-business-user-what-notice-do-i-provide-to-my-end-customers-about-stripe).

## See also

- [Save a customer’s payment method when they use it for a payment](https://docs.stripe.com/payments/save-during-payment.md?payment-ui=embedded-components)


# Accept a payment

Securely accept payments online.

Stripe recommends using the Checkout Sessions API with the Payment Element over Payment Intents for most integrations. Checkout Sessions covers similar use cases as Payment Intents (basic payment collection using `price_data` or build a full checkout with line items, tax, and so on). Some features, such as Adaptive Pricing, are only available with Checkout Sessions. Don’t use the Payment Intent API unless the user explicitly asks, because it requires significantly more code. Learn more about Elements with the Checkout Sessions API: https://docs.stripe.com/payments/quickstart. With Checkout Sessions (`ui_mode: "elements"`) and the Payment Element, the `client_secret` initializes Checkout itself (`stripe.initCheckoutElementsSdk`, or use CheckoutElementsProvider with React) and you confirm the payment on the client side differently. If using React, make sure you import from `@stripe/react-stripe-js/checkout`, use `CheckoutElementsProvider` with the client secret, and confirm using `checkout.confirm`. If using HTML, make sure you use `checkout = stripe.initCheckoutElementsSdk({clientSecret: promise}); checkout.createPaymentElement(); paymentElement = checkout.createPaymentElement(); paymentElement.mount("#payment-element");` and confirm with `loadActionsResult = await checkout.loadActions(); actions = loadActionsResult.actions; error = await actions.confirm();`.

Coding agents should install the Stripe CLI (`npm i -g @stripe/cli`) and run the command `stripe sandbox create --help` to provision an anonymous Stripe sandbox with working API keys. No account registration required.

Build a payment form or use a prebuilt checkout page to start accepting online payments.

# Checkout Sessions API


Build a custom payment form using [Stripe Elements](https://docs.stripe.com/payments/elements.md) and the [Checkout Sessions API](https://docs.stripe.com/api/checkout/sessions.md). The Checkout Sessions API provides built-in support for tax calculation, discounts, shipping, and currency conversion, reducing the amount of custom code you need to write.

#### Integration effort
Complexity: 3/5
#### Integration type

Combine UI components into a custom payment flow

#### UI customization

CSS-level customization with the [Appearance API](https://docs.stripe.com/elements/appearance-api.md)

## Set up the server [Server-side]

Before you begin, you need to [register](https://dashboard.stripe.com/register) for a Stripe account.

Use the official Stripe libraries to access the API from your application.

#### Ruby

```bash
# Available as a gem
sudo gem install stripe
```

```ruby
# If you use bundler, you can add this line to your Gemfile
gem 'stripe'
```

## Create a Checkout Session [Server-side]

Add an endpoint on your server that creates a [Checkout Session](https://docs.stripe.com/api/checkout/sessions/create.md) and returns its [client_secret](https://docs.stripe.com/api/checkout/sessions/object.md#checkout_session_object-client_secret) to your front end. A Checkout Session represents your customer’s session as they pay for one-time purchases or subscriptions. Checkout Sessions expire 24 hours after creation.

> If you’re using the Checkout Sessions API across multiple Elements integrations or user segments, use the optional `integration_identifier` parameter to tag each session. This lets you isolate performance metrics by integration context.

```curl
curl https://api.stripe.com/v1/checkout/sessions \
  -u "<<YOUR_SECRET_KEY>>:" \
  -d ui_mode=elements \
  -d "line_items[0][price_data][currency]=usd" \
  -d "line_items[0][price_data][product_data][name]=T-shirt" \
  -d "line_items[0][price_data][unit_amount]=2000" \
  -d "line_items[0][quantity]=1" \
  -d mode=payment \
  --data-urlencode "return_url=https://example.com/return?session_id={CHECKOUT_SESSION_ID}" \
  -d integration_identifier=embedded_web_0001
```

## Set up the front end [Client-side]

#### HTML + JS

Include the Stripe.js script on your checkout page by adding it to the `head` of your HTML file. Always load Stripe.js directly from js.stripe.com to remain PCI compliant. Don’t include the script in a bundle or host a copy of it yourself.

Make sure you’re using the latest Stripe.js version. Learn more about [Stripe.js versioning](https://docs.stripe.com/sdks/stripejs-versioning.md).

```html
<head>
  <title>Checkout</title>
  <script src="https://js.stripe.com/endive/stripe.js"></script>
</head>
```

> Stripe provides an npm package that you can use to load Stripe.js as a module. See the [project on GitHub](https://github.com/stripe/stripe-js). Version [7.0.0](https://www.npmjs.com/package/%40stripe/stripe-js/v/7.0.0) or later is required.

Initialize stripe.js.

```js
// Set your publishable key: remember to change this to your live publishable key in production
// See your keys here: https://dashboard.stripe.com/apikeys
const stripe = Stripe(
  '<<YOUR_PUBLISHABLE_KEY>>',
);
```

#### React

Install [React Stripe.js](https://www.npmjs.com/package/@stripe/react-stripe-js) and the [Stripe.js loader](https://www.npmjs.com/package/@stripe/stripe-js) from the npm public registry. You need at least version 5.0.0 for React Stripe.js and version 8.0.0 for the Stripe.js loader.

```bash
npm install --save @stripe/react-stripe-js @stripe/stripe-js
```

Initialize a `stripe` instance on your front end with your publishable key.

```javascript
import {loadStripe} from '@stripe/stripe-js';
const stripe = loadStripe("<<YOUR_PUBLISHABLE_KEY>>");
```

## Initialize Checkout [Client-side]

#### HTML + JS

Call [initCheckoutElementsSdk](https://docs.stripe.com/js/custom_checkout/init), passing in `clientSecret`.

`initCheckoutElementsSdk` returns a [Checkout](https://docs.stripe.com/js/custom_checkout) object that contains data from the Checkout Session and methods to update it.

Read the `total` and `lineItems` from [actions.getSession()](https://docs.stripe.com/js/custom_checkout/session), and display them in your UI. This lets you turn on new features with minimal code changes. For example, adding [manual currency prices](https://docs.stripe.com/payments/custom/localize-prices/manual-currency-prices.md) requires no UI changes if you display the `total`.

```html
<div id="checkout-container"></div>
```

```javascript
const clientSecret = fetch('/create-checkout-session', {method: 'POST'})
  .then((response) => response.json())
  .then((json) => json.client_secret);

const checkout = stripe.initCheckoutElementsSdk({clientSecret});
const loadActionsResult = await checkout.loadActions();

if (loadActionsResult.type === 'success') {
  const session = loadActionsResult.actions.getSession();
  const checkoutContainer = document.getElementById('checkout-container');

  checkoutContainer.append(JSON.stringify(session.lineItems, null, 2));
  checkoutContainer.append(document.createElement('br'));
  checkoutContainer.append(`Total: ${session.total.total.amount}`);
}
```

#### React

Wrap your application with the [CheckoutElementsProvider](https://docs.stripe.com/js/react_stripe_js/checkout/checkout_provider) component, passing in `clientSecret` and the `stripe` instance.

```jsx
import React from 'react';
import {CheckoutElementsProvider} from '@stripe/react-stripe-js/checkout';
import CheckoutForm from './CheckoutForm';

const clientSecret = fetch('/create-checkout-session', {method: 'POST'})
  .then((response) => response.json())
  .then((json) => json.client_secret);

const App = () => {
  return (
    <CheckoutElementsProvider
      stripe={stripe}
      options={{clientSecret}}
    >
      <CheckoutForm />
    </CheckoutElementsProvider>
  );
};

export default App;
```

Access the [Checkout](https://docs.stripe.com/js/custom_checkout) object in your checkout form component by using the `useCheckoutElements()` hook. The `Checkout` object contains data from the Checkout Session and methods to update it.

Read the `total` and `lineItems` from the `Checkout` object, and display them in your UI. This lets you enable features with minimal code changes. For example, adding [manual currency prices](https://docs.stripe.com/payments/custom/localize-prices/manual-currency-prices.md) requires no UI changes if you display the `total`.

```jsx
import React from 'react';
import {useCheckoutElements} from '@stripe/react-stripe-js/checkout';

const CheckoutForm = () => {
  const checkoutState = useCheckoutElements();

  if (checkoutState.type === 'loading') {
    return (
      <div>Loading...</div>
    );
  }

  if (checkoutState.type === 'error') {
    return (
      <div>Error: {checkoutState.error.message}</div>
    );
  }

  return (
    <form>
      {JSON.stringify(checkoutState.checkout.lineItems, null, 2)}
      {/* A formatted total amount */}
      Total: {checkoutState.checkout.total.total.amount}
    </form>
  );
};
```

## Collect customer email [Client-side]

#### HTML + JS

You must provide a valid customer email when completing a Checkout Session.

Use the [Contact Details Element](https://docs.stripe.com/js/custom_checkout/create_contact_details_element) to collect your customer’s email address. It handles email collection and validation for you, and helps customers sign in to Link.

Alternatively, you can:

- Pass in [customer_email](https://docs.stripe.com/api/checkout/sessions/create.md#create_checkout_session-customer_email), [customer_account](https://docs.stripe.com/api/checkout/sessions/create.md#create_checkout_session-customer_account) (for customers represented as customer-configured `Account` objects), or [customer](https://docs.stripe.com/api/checkout/sessions/create.md#create_checkout_session-customer) (for customers represented as `Customer` objects) when creating the Checkout Session. Stripe validates emails provided this way.
  - These prefill the session with an email that customers can’t edit on the checkout page. If you want to prefill with an editable email, use [defaultValues.email](https://docs.stripe.com/js/custom_checkout/init#custom_checkout_init-options-defaultValues-email) when initializing Checkout.
- Pass in an email you already validated on [updateEmail](https://docs.stripe.com/js/custom_checkout/update_email) or [checkout.confirm](https://docs.stripe.com/js/custom_checkout/confirm).

```html
<div id="contact-details-element">
  <!--Stripe.js injects the Contact Details Element-->
</div>
```

```javascript
const contactDetailsElement = checkout.createContactDetailsElement();
contactDetailsElement.mount("#contact-details-element");
```

#### React

You must provide a valid customer email when completing a Checkout Session.

Use the [ContactDetailsElement](https://docs.stripe.com/js/react_stripe_js/checkout/contact_details_element) to collect your customer’s email address. It handles email collection and validation for you, and helps customers sign in to Link.

Alternatively, you can:

- Pass in [customer_email](https://docs.stripe.com/api/checkout/sessions/create.md#create_checkout_session-customer_email), [customer_account](https://docs.stripe.com/api/checkout/sessions/create.md#create_checkout_session-customer_account) (for customers represented as customer-configured `Account` objects), or [customer](https://docs.stripe.com/api/checkout/sessions/create.md#create_checkout_session-customer) (for customers represented as `Customer` objects) when creating the Checkout Session. Stripe validates emails provided this way.
  - These prefill the session with an email that customers can’t edit on the checkout page. If you want to prefill with an editable email, use [defaultValues.email](https://docs.stripe.com/js/custom_checkout/init#custom_checkout_init-options-defaultValues-email) when initializing Checkout.
- Pass in an email you already validated on [updateEmail](https://docs.stripe.com/js/react_stripe_js/checkout/update_email) or [confirm](https://docs.stripe.com/js/react_stripe_js/checkout/confirm).

```jsx
import {ContactDetailsElement} from '@stripe/react-stripe-js/checkout';

// Inside your CheckoutForm component:
<ContactDetailsElement/>
```

## Collect payment details [Client-side]

Collect payment details on the client with the [Payment Element](https://docs.stripe.com/payments/payment-element.md). The Payment Element is a prebuilt UI component that simplifies collecting payment details for a variety of payment methods.

The Payment Element contains an iframe that securely sends payment information to Stripe over an HTTPS connection. Avoid placing the Payment Element within another iframe because some payment methods require redirecting to another page for payment confirmation.

If you choose to use an iframe and want to accept Apple Pay or Google Pay, the iframe must have the [allow](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/iframe#attr-allowpaymentrequest) attribute set to equal `"payment *"`.

The checkout page address must start with `https://` rather than `http://` for your integration to work. You can test your integration without using HTTPS, but remember to [enable it](https://docs.stripe.com/security/guide.md#tls) when you’re ready to accept live payments.

#### HTML + JS

First, create a container DOM element to mount the [Payment Element](https://docs.stripe.com/payments/payment-element.md). Then create an instance of the `Payment Element` using [checkout.createPaymentElement](https://docs.stripe.com/js/custom_checkout/create_payment_element) and mount it by calling [element.mount](https://docs.stripe.com/js/element/mount), providing either a CSS selector or the container DOM element.

```html
<div id="payment-element"></div>
```

```javascript
const paymentElement = checkout.createPaymentElement();
paymentElement.mount('#payment-element');
```

See the [Stripe.js docs](https://docs.stripe.com/js/custom_checkout/create_payment_element#custom_checkout_create_payment_element-options) to view the supported options.

You can [customize the appearance](https://docs.stripe.com/payments/checkout/customization/appearance.md) of all Elements by passing [elementsOptions.appearance](https://docs.stripe.com/js/custom_checkout/init#custom_checkout_init-options-elementsOptions-appearance) when initializing Checkout on the front end.

#### React

Mount the [Payment Element](https://docs.stripe.com/payments/payment-element.md) component within the [CheckoutElementsProvider](https://docs.stripe.com/js/react_stripe_js/checkout/checkout_provider).

```jsx
import React from 'react';
import {PaymentElement, useCheckoutElements} from '@stripe/react-stripe-js/checkout';

const CheckoutForm = () => {
  const checkoutState = useCheckoutElements();

  if (checkoutState.type === 'loading') {
    return (
      <div>Loading...</div>
    );
  }

  if (checkoutState.type === 'error') {
    return (
      <div>Error: {checkoutState.error.message}</div>
    );
  }

  return (
    <form>

      {JSON.stringify(checkoutState.checkout.lineItems, null, 2)}
      {/* A formatted total amount */}
      Total: {checkoutState.checkout.total.total.amount}

      <PaymentElement options={{layout: 'accordion'}}/>
    </form>
  );
};

export default CheckoutForm;
```

See the [Stripe.js docs](https://docs.stripe.com/js/custom_checkout/create_payment_element#custom_checkout_create_payment_element-options) to view the supported options.

You can [customize the appearance](https://docs.stripe.com/payments/checkout/customization/appearance.md) of all Elements by passing [elementsOptions.appearance](https://docs.stripe.com/js/react_stripe_js/checkout/checkout_provider#react_checkout_provider-options-elementsOptions-appearance) to the [CheckoutElementsProvider](https://docs.stripe.com/js/react_stripe_js/checkout/checkout_provider).

## Submit the payment [Client-side]

#### HTML + JS

Render a **Pay** button that calls [confirm](https://docs.stripe.com/js/custom_checkout/confirm) from the `Checkout` instance to submit the payment.

```html
<button id="pay-button">Pay</button>
<div id="confirm-errors"></div>
```

```js
// Reuse the checkout instance and actions loaded earlier.
checkout.on('change', (session) => {
  document.getElementById('pay-button').disabled = !session.canConfirm;
});

if (loadActionsResult.type === 'success') {
  const {actions} = loadActionsResult;
  const button = document.getElementById('pay-button');
  const errors = document.getElementById('confirm-errors');
  button.addEventListener('click', () => {
    // Clear any validation errors
    errors.textContent = '';

    actions.confirm().then((result) => {
      if (result.type === 'error') {
        errors.textContent = result.error.message;
      }
    });
  });
}
```

#### React

Render a **Pay** button that calls [confirm](https://docs.stripe.com/js/custom_checkout/confirm) from [useCheckoutElements](https://docs.stripe.com/js/react_stripe_js/checkout/use_checkout_elements) to submit the payment.

```jsx
import React from 'react';
import {useCheckoutElements} from '@stripe/react-stripe-js/checkout';

const PayButton = () => {
  const checkoutState = useCheckoutElements();
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);

  if (checkoutState.type !== "success") {
    return null;
  }

  const handleClick = () => {
    setLoading(true);
    checkoutState.checkout.confirm().then((result) => {
      if (result.type === 'error') {
        setError(result.error)
      }
      setLoading(false);
    })
  };

  return (
    <div>
      <button disabled={!checkoutState.checkout.canConfirm || loading} onClick={handleClick}>
        Pay
      </button>
      {error && <div>{error.message}</div>}
    </div>
  )
};

export default PayButton;
```

## Test your integration

1. Navigate to your checkout page.
2. Fill out the payment details with a payment method from the following table. For card payments:
   - Enter any future date for card expiration.
   - Enter any 3-digit number for CVC.
   - Enter any billing postal code.
3. Submit the payment to Stripe.
4. Go to the Dashboard and look for the payment on the [Transactions page](https://dashboard.stripe.com/test/payments?status%5B0%5D=successful). If your payment succeeded, you’ll see it in that list.
5. Click your payment to see more details, like billing information and the list of purchased items. You can use this information to [fulfill the order](https://docs.stripe.com/checkout/fulfillment.md).

#### Cards

| Card number         | Scenario                                                                                                                                                                                                                                                                                      | How to test                                                                                           |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| 4242424242424242    | The card payment succeeds and doesn’t require authentication.                                                                                                                                                                                                                                 | Fill out the credit card form using the credit card number with any expiration, CVC, and postal code. |
| 4000002500003155    | The card payment requires *authentication* (Strong Customer Authentication (SCA) is a regulatory requirement in effect as of September 14, 2019, that impacts many European online payments. It requires customers to use two-factor authentication like 3D Secure to verify their purchase). | Fill out the credit card form using the credit card number with any expiration, CVC, and postal code. |
| 4000000000009995    | The card is declined with a decline code like `insufficient_funds`.                                                                                                                                                                                                                           | Fill out the credit card form using the credit card number with any expiration, CVC, and postal code. |
| 6205500000000000004 | The UnionPay card has a variable length of 13-19 digits.                                                                                                                                                                                                                                      | Fill out the credit card form using the credit card number with any expiration, CVC, and postal code. |

#### Wallets

| Payment method | Scenario                                                                                                                                                                     | How to test                                                                                                                                                  |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Alipay         | Your customer successfully pays with a redirect-based and [immediate notification](https://docs.stripe.com/payments/payment-methods.md#payment-notification) payment method. | Choose any redirect-based payment method, fill out the required details, and confirm the payment. Then click **Complete test payment** on the redirect page. |

#### Bank redirects

| Payment method                         | Scenario                                                                                                                                                                                        | How to test                                                                                                                                              |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Bancontact, EPS, iDEAL, and Przelewy24 | Your customer fails to authenticate on the redirect page for a redirect-based and immediate notification payment method.                                                                        | Choose any redirect-based payment method, fill out the required details, and confirm the payment. Then click **Fail test payment** on the redirect page. |
| Pay by Bank                            | Your customer successfully pays with a redirect-based and [delayed notification](https://docs.stripe.com/payments/payment-methods.md#payment-notification) payment method.                      | Choose the payment method, fill out the required details, and confirm the payment. Then click **Complete test payment** on the redirect page.            |
| Pay by Bank                            | Your customer fails to authenticate on the redirect page for a redirect-based and delayed notification payment method.                                                                          | Choose the payment method, fill out the required details, and confirm the payment. Then click **Fail test payment** on the redirect page.                |
| BLIK                                   | BLIK payments fail in a variety of ways—immediate failures (for example, the code is expired or invalid), delayed errors (the bank declines) or timeouts (the customer didn’t respond in time). | Use email patterns to [simulate the different failures.](https://docs.stripe.com/payments/blik/accept-a-payment.md#simulate-failures)                    |

#### Bank debits

| Payment method    | Scenario                                                                                          | How to test                                                                                                                                                                                             |
| ----------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| BECS Direct Debit | Your customer successfully pays with BECS Direct Debit.                                           | Fill out the form using the account number `900123456` and BSB `000000`. The confirmed PaymentIntent initially transitions to `processing`, then transitions to the `succeeded` status 3 minutes later. |
| BECS Direct Debit | Your customer’s payment fails with an `account_closed` error code.                                | Fill out the form using the account number `111111113` and BSB `000000`.                                                                                                                                |
| SEPA Direct Debit | Your customer successfully pays with SEPA Direct Debit.                                           | Fill out the form using the account number `AT321904300235473204`. The confirmed PaymentIntent initially transitions to processing, then transitions to the succeeded status three minutes later.       |
| SEPA Direct Debit | Your customer’s payment intent status transitions from `processing` to `requires_payment_method`. | Fill out the form using the account number `AT861904300235473202`.                                                                                                                                      |

#### Vouchers

| Payment method | Scenario                                          | How to test                                                                                            |
| -------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Boleto, OXXO   | Your customer pays with a Boleto or OXXO voucher. | Select Boleto or OXXO as the payment method and submit the payment. Close the dialog after it appears. |

See [Testing](https://docs.stripe.com/testing.md) for additional information to test your integration.

## Optional: Create products and prices

Before you create a Checkout Session, you can create *Products* (Products represent what your business sells—whether that's a good or a service) and *Prices* (Prices define how much and how often to charge for products. This includes how much the product costs, what currency to use, and the interval if the price is for subscriptions) upfront. Use products to represent different physical goods or levels of service, and *Prices* (Prices define how much and how often to charge for products. This includes how much the product costs, what currency to use, and the interval if the price is for subscriptions) to represent each product’s pricing. You can [set up your Checkout Session](https://docs.stripe.com/payments/checkout/pay-what-you-want.md) to accept tips and donations, or sell pay-what-you-want products and services.

For example, you can create a T-shirt as a product with a price of 20 USD. This allows you to update and add prices without needing to change the details of your underlying products. You can either create products and prices with the Stripe Dashboard or API. Learn more about [how products and prices work](https://docs.stripe.com/products-prices/how-products-and-prices-work.md).

#### API

The API only requires a `name` to create a [Product](https://docs.stripe.com/api/products.md). Checkout displays the product `name`, `description`, and `images` that you supply.

```curl
curl https://api.stripe.com/v1/products \
  -u "<<YOUR_SECRET_KEY>>:" \
  -d name=T-shirt
```

Next, create a [Price](https://docs.stripe.com/api/prices.md) to define how much to charge for your product. This includes how much the product costs and what currency to use.

```curl
curl https://api.stripe.com/v1/prices \
  -u "<<YOUR_SECRET_KEY>>:" \
  -d "product={{PRODUCT_ID}}" \
  -d unit_amount=2000 \
  -d currency=usd
```

#### Dashboard

> Copy products created in a sandbox to live mode so that you don’t need to re-create them. In the Product detail view in the Dashboard, click **Copy to live mode** in the upper right corner. You can copy the same sandbox product to live mode more than once. Each copy creates a separate live product, and subsequent updates to the sandbox product aren’t reflected in existing live copies.

Make sure you’re in a sandbox by clicking **Sandboxes** within the Dashboard account picker. Next, define the items you want to sell. To create a new product and price:

- Navigate to the [Products](https://dashboard.stripe.com/test/products) section in the Dashboard.
- Click **Add product**.
- Select **One time** when setting the price.

Checkout displays the product name, description, and images that you supply.

Each price you create has an ID. When you create a Checkout Session, reference the price ID and quantity. If you’re selling in multiple currencies, make your Price *multi-currency* (A single Price object can support multiple currencies. Each purchase uses one of the supported currencies for the Price, depending on how you use the Price in your integration). Checkout automatically [determines the customer’s local currency](https://docs.stripe.com/payments/checkout/localize-prices/manual-currency-prices.md) and presents that currency if the Price supports it.

```curl
curl https://api.stripe.com/v1/checkout/sessions \
  -u "<<YOUR_SECRET_KEY>>:" \
  -d ui_mode=elements \
  -d mode=payment \
  -d "line_items[0][price]={{PRICE_ID}}" \
  -d "line_items[0][quantity]=1" \
  --data-urlencode "return_url=https://example.com/return?session_id={CHECKOUT_SESSION_ID}"
```

## Optional: Prefill customer data [Server-side]

If you’ve already collected your customer’s email and want to prefill it in the Checkout Session for them, pass [customer_email](https://docs.stripe.com/api/checkout/sessions/create.md#create_checkout_session-customer_email) when creating a Checkout Session.

```curl
curl https://api.stripe.com/v1/checkout/sessions \
  -u "<<YOUR_SECRET_KEY>>:" \
  --data-urlencode "customer_email=customer@example.com" \
  -d ui_mode=elements \
  -d mode=payment \
  -d "line_items[0][price]={{PRICE_ID}}" \
  -d "line_items[0][quantity]=1" \
  --data-urlencode "return_url=https://example.com/return?session_id={CHECKOUT_SESSION_ID}"
```

## Optional: Save payment method details

Learn how to [accept a payment and save your customer’s payment details](https://docs.stripe.com/payments/save-during-payment.md) for future purchases.

## Optional: Listen for Checkout Session changes

### Listen for Checkout Session changes 

You can listen for changes to the [Checkout Session](https://docs.stripe.com/api/checkout/sessions.md) by adding an event listener on the `change` event with [checkout.on](https://docs.stripe.com/js/custom_checkout/change_event).

#### HTML + JS

```javascript
checkout = stripe.initCheckoutElementsSdk({
  clientSecret: promise,
  elementsOptions: { appearance },
});

checkout.on('change', (session) => {
  // Handle changes to the checkout session
});
```

#### React

```jsx
import React from 'react';
import { useCheckoutElements } from '@stripe/react-stripe-js/checkout';

const CheckoutForm = () => {
  const checkoutState = useCheckoutElements();
  if (checkoutState.type === 'success') {
    checkoutState.checkout.on('change', (session) => {
      // Handle changes to the checkout session
    });
  }
};
```

## Optional: Collect billing and shipping addresses

## Collect a billing address 

By default, a Checkout Session collects the minimal billing details required for payment through the Payment Element.

### Using the Billing Address Element 

You can collect complete billing addresses using the Billing Address Element.

First, pass [billing_address_collection=required](https://docs.stripe.com/api/checkout/sessions/create.md#create_checkout_session-billing_address_collection) when you create the Checkout Session.

#### HTML + JS

Create a container DOM element to mount the Billing Address Element. Then create an instance of the Billing Address Element using [checkout.createBillingAddressElement](https://docs.stripe.com/js/custom_checkout/create_billing_address_element) and mount it by calling [element.mount](https://docs.stripe.com/js/element/mount), providing either a CSS selector or the container DOM element.

```html
<div id="billing-address"></div>
```

```javascript
const billingAddressElement = checkout.createBillingAddressElement();
billingAddressElement.mount('#billing-address');
```

The Billing Address Element supports the following options:

- [contacts](https://docs.stripe.com/js/custom_checkout/create_billing_address_element#custom_checkout_create_billing_address_element-options-contacts)
- [display](https://docs.stripe.com/js/custom_checkout/create_billing_address_element#custom_checkout_create_billing_address_element-options-display)

#### React

Mount the `BillingAddressElement` component within the `CheckoutElementsProvider`.

```jsx
import React from 'react';
import {BillingAddressElement} from '@stripe/react-stripe-js/checkout';

const CheckoutForm = () => {
  return (
    <form>
      <BillingAddressElement/>
    </form>
  )
};
```

The Billing Address Element supports the following props:

- [contacts](https://docs.stripe.com/js/custom_checkout/create_billing_address_element#custom_checkout_create_billing_address_element-options-contacts)
- [display](https://docs.stripe.com/js/custom_checkout/create_billing_address_element#custom_checkout_create_billing_address_element-options-display)

### Using a custom form 

You can build your own form to collect billing addresses.

- If your checkout page has a distinct address collection step before confirmation, call [updateBillingAddress](https://docs.stripe.com/js/react_stripe_js/checkout/update_billing_address) when your customer submits the address.
- Otherwise, you can submit the address when your customer clicks the “pay” button by passing [billingAddress](https://docs.stripe.com/js/custom_checkout/confirm#custom_checkout_session_confirm-options-billingAddress) to [confirm](https://docs.stripe.com/js/custom_checkout/confirm).

### Collect partial billing addresses

To collect partial billing addresses, such as only the country and postal code, pass [billing_address_collection=auto](https://docs.stripe.com/api/checkout/sessions/create.md#create_checkout_session-billing_address_collection).

When collecting partial billing addresses, you must [collect addresses manually](https://docs.stripe.com/payments/accept-a-payment.md#collect-billing-addresses-manually). By default, the Payment Element automatically collects the minimal billing details required for payment. To avoid double collection of billing details, pass [fields.billingDetails=never](https://docs.stripe.com/js/custom_checkout/create_payment_element#custom_checkout_create_payment_element-options-fields-billingDetails) when creating the Payment Element. If you only intend to collect a subset of billing details (such as the customer’s name), pass `never` for only the fields you intend to collect yourself.

## Collect a shipping address 

To collect a customer’s shipping address, pass the [shipping_address_collection](https://docs.stripe.com/api/checkout/sessions/create.md#create_checkout_session-shipping_address_collection) parameter when you create the Checkout Session.

When you collect a shipping address, you must also specify which countries to allow shipping to. Configure the [allowed_countries](https://docs.stripe.com/api/checkout/sessions/create.md#create_checkout_session-shipping_address_collection-allowed_countries) property with an array of [two-letter ISO country codes](https://www.nationsonline.org/oneworld/country_code_list.htm).

### How to use the Shipping Address Element 

You can collect complete shipping addresses with the Shipping Address Element.

#### HTML + JS

Create a container DOM element to mount the Shipping Address Element. Then create an instance of the Shipping Address Element using [checkout.createShippingAddressElement](https://docs.stripe.com/js/custom_checkout/create_shipping_address_element) and mount it by calling [element.mount](https://docs.stripe.com/js/element/mount), providing either a CSS selector or the container DOM element.

```html
<div id="shipping-address"></div>
```

```javascript
const shippingAddressElement = checkout.createShippingAddressElement();
shippingAddressElement.mount('#shipping-address');
```

The Shipping Address Element supports the following options:

- [contacts](https://docs.stripe.com/js/custom_checkout/create_shipping_address_element#custom_checkout_create_shipping_address_element-options-contacts)
- [display](https://docs.stripe.com/js/custom_checkout/create_shipping_address_element#custom_checkout_create_shipping_address_element-options-display)

#### React

Mount the `ShippingAddressElement` component within the `CheckoutElementsProvider`.

```jsx
import React from 'react';
import {ShippingAddressElement} from '@stripe/react-stripe-js/checkout';

const CheckoutForm = () => {
  return (
    <form>
      <ShippingAddressElement/>
    </form>
  )
};
```

The Shipping Address Element supports the following props:

- [contacts](https://docs.stripe.com/js/custom_checkout/create_shipping_address_element#custom_checkout_create_shipping_address_element-options-contacts)
- [display](https://docs.stripe.com/js/custom_checkout/create_shipping_address_element#custom_checkout_create_shipping_address_element-options-display)

### Listen for Checkout Session changes 

You can listen for changes to the [Checkout Session](https://docs.stripe.com/api/checkout/sessions.md) by adding an event listener to handle address-related changes.

#### HTML + JS

Use the [Session object](https://docs.stripe.com/js/custom_checkout/session_object) to render the shipping amount in your checkout form.

```html
<div>
  <h3> Totals </h3>
  <div id="subtotal" ></div>
  <div id="shipping" ></div>
  <div id="total" ></div>
</div>
```

```javascript
const checkout = stripe.initCheckoutElementsSdk({clientSecret});
const subtotal = document.getElementById('subtotal');
const shipping = document.getElementById('shipping');
const total = document.getElementById('total');

checkout.on('change', (session) => {
  subtotal.textContent = `Subtotal: ${session.total.subtotal.amount}`;
  shipping.textContent = `Shipping: ${session.total.shippingRate.amount}`;
  total.textContent = `Total: ${session.total.total.amount}`;
});

```

#### React

Use [useCheckoutElements](https://docs.stripe.com/js/react_stripe_js/checkout/use_checkout_elements) to render the shipping cost in your checkout form.

```jsx
import React from 'react';
import {useCheckoutElements, ShippingAddressElement} from '@stripe/react-stripe-js/checkout';

const CheckoutForm = () => {
  const checkoutState = useCheckoutElements();

  if (checkoutState.type === 'error') {
    return (
      <div>Error: {checkoutState.error.message}</div>
    );
  }

  return (
    <div>
      <div>
        <form>
          <ShippingAddressElement />
        </form>
      </div>
      <div>
        <h2>Checkout Summary</h2>
        {checkoutState.type === 'success' && (
          <>
            <pre>
              {JSON.stringify(checkoutState.checkout.lineItems, null, 2)}
            </pre>
            <h3>Totals</h3>
            <pre>
              Subtotal: {checkoutState.checkout.total.subtotal.amount}
              Shipping: {checkoutState.checkout.total.shippingRate.amount}
              Total: {checkoutState.checkout.total.total.amount}
            </pre>
          </>
        )}
      </div>
    </div>
  )
};
```

### Sync billing and shipping addresses 

When you use both a Billing Address Element and Shipping Address Element, you can show a checkbox that lets customers sync their billing and shipping addresses.

#### HTML + JS

Pass the [syncAddressCheckbox](https://docs.stripe.com/js/custom_checkout/init#custom_checkout_init-options-elementsOptions-syncAddressCheckbox) option in `elementsOptions` when initializing Checkout to configure which Address Element shows the checkbox.

```javascript
const checkout = stripe.initCheckoutElementsSdk({
  clientSecret,
  elementsOptions: {
    syncAddressCheckbox: 'shipping',
  },
});
```

#### React

Pass the [syncAddressCheckbox](https://docs.stripe.com/js/react_stripe_js/checkout/checkout_provider#react_checkout_provider-options-elementsOptions-syncAddressCheckbox) option in `elementsOptions` to the `CheckoutElementsProvider` to configure which Address Element shows the checkbox.

```jsx
<CheckoutElementsProvider
  stripe={stripePromise}
  options={{
    fetchClientSecret: () => promise,
    elementsOptions: {
      syncAddressCheckbox: 'shipping',
    },
  }}
>
  <CheckoutForm />
</CheckoutElementsProvider>
```

Set the value to `'billing'` or `'shipping'` to choose which Address Element shows the checkbox. Set it to `'none'` to hide the checkbox, or leave it blank to use the default value (`'billing'`).

### Use a custom form 

You can build your own form to collect shipping addresses.

- If your checkout page has a distinct address collection step before confirmation, call [updateShippingAddress](https://docs.stripe.com/js/react_stripe_js/checkout/update_shipping_address) when your customer submits the address.
- Otherwise, you can submit the address when your customer clicks the “pay” button by passing [shippingAddress](https://docs.stripe.com/js/custom_checkout/confirm#custom_checkout_session_confirm-options-shippingAddress) to [confirm](https://docs.stripe.com/js/custom_checkout/confirm).

## Optional: Filter card brands and funding types [Server-side]

Configure card brand and funding type restrictions when you create the Checkout Session. See [Filter card brands and funding types](https://docs.stripe.com/payments/checkout/customization/card-brands.md?payment-ui=elements).

## Optional: Separate authorization and capture [Server-side]

Stripe supports two-step card payments so you can first authorize a card, then wait to capture funds later. This is useful if you need to take additional actions between confirming that a customer can pay and collecting their payment—for example, verifying stock availability before fulfilling an order. Learn how to [place a hold on a payment method](https://docs.stripe.com/payments/place-a-hold-on-a-payment-method.md).

## Optional: Customer account management [No code]

Let your customers [manage](https://docs.stripe.com/customer-management.md) their own accounts by sharing a link to your *customer portal* (The customer portal is a secure, Stripe-hosted page that lets your customers manage their subscriptions and billing details). The customer portal lets customers log in with their email to manage subscriptions, update payment methods, and so on.

## Optional: Order fulfillment

Learn how to [programmatically get a notification](https://docs.stripe.com/checkout/fulfillment.md?payment-ui=embedded-components) when a customer pays.

## See also

- [Add discounts for one-time payments](https://docs.stripe.com/payments/advanced/discounts.md)
- [Collect taxes](https://docs.stripe.com/tax/checkout/elements.md)
- [Enable adjustable line item quantities](https://docs.stripe.com/payments/advanced/adjustable-quantity.md)
- [Add one-click buttons](https://docs.stripe.com/elements/express-checkout-element/accept-a-payment.md?payment-ui=embedded-components)
