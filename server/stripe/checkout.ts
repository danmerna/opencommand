import Stripe from "stripe";
import { ENV } from "../_core/env";
import { PRODUCTS, type ProductKey } from "./products";

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(ENV.stripeSecretKey, { apiVersion: "2026-02-25.clover" });
  }
  return _stripe;
}

export interface CheckoutParams {
  productKey: ProductKey;
  userId: number;
  userEmail: string;
  userName: string;
  origin: string;
  blueprintId?: number;
  listingId?: number;
}

export async function createCheckoutSession(params: CheckoutParams): Promise<string> {
  const stripe = getStripe();
  // Support both exact keys and lowercase variants from frontend
  const key = params.productKey.toUpperCase() as ProductKey;
  const product = PRODUCTS[key];
  if (!product) {
    throw new Error(`Unknown product: ${params.productKey}`);
  }

  const lineItem: Stripe.Checkout.SessionCreateParams.LineItem = {
    price_data: {
      currency: product.currency,
      product_data: {
        name: product.name,
        description: product.description,
      },
      unit_amount: product.priceAmount,
      ...(product.type === "subscription"
        ? { recurring: { interval: (product as any).interval } }
        : {}),
    },
    quantity: 1,
  };

  const session = await stripe.checkout.sessions.create({
    mode: product.type === "subscription" ? "subscription" : "payment",
    line_items: [lineItem],
    customer_email: params.userEmail,
    client_reference_id: params.userId.toString(),
    metadata: {
      user_id: params.userId.toString(),
      customer_email: params.userEmail,
      customer_name: params.userName,
      product_key: params.productKey,
      tier: product.tier,
      ...(params.blueprintId ? { blueprint_id: params.blueprintId.toString() } : {}),
      ...(params.listingId ? { listing_id: params.listingId.toString() } : {}),
    },
    allow_promotion_codes: true,
    success_url: `${params.origin}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${params.origin}/payment/cancel`,
  });

  return session.url!;
}

export async function handleWebhookEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      console.log(`[Stripe] Checkout completed for user ${session.metadata?.user_id}, product: ${session.metadata?.product_key}`);
      // Fulfillment: activate subscription, deploy blueprint, etc.
      break;
    }
    case "invoice.paid": {
      const invoice = event.data.object as Stripe.Invoice;
      console.log(`[Stripe] Invoice paid: ${invoice.id}`);
      break;
    }
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      console.log(`[Stripe] Subscription cancelled: ${subscription.id}`);
      break;
    }
    default:
      console.log(`[Stripe] Unhandled event type: ${event.type}`);
  }
}
