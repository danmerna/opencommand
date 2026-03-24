/**
 * OpenCommand Stripe Products & Prices
 * Centralized product definitions for marketplace checkout.
 */

export const PRODUCTS = {
  PRO: {
    name: "Pro",
    description: "Full self-contextualizing engine for serious operators. 100 commands/mo, 10 tools, 5 agents.",
    priceAmount: 2900, // $29.00 in cents
    currency: "usd",
    interval: "month" as const,
    type: "subscription" as const,
    tier: "pro",
    trialDays: 7,
  },
  BUSINESS: {
    name: "Business",
    description: "Unlimited everything. Full API access. Marketplace selling. For teams and agencies.",
    priceAmount: 9900, // $99.00 in cents
    currency: "usd",
    interval: "month" as const,
    type: "subscription" as const,
    tier: "business",
    trialDays: 7,
  },
  SOLO_FOUNDER_CEO: {
    name: "ARCH Solo-Founder CEO",
    description: "Your first autonomous executive hire. Orchestrates up to 3 subordinate agents.",
    priceAmount: 19900, // $199.00 in cents
    currency: "usd",
    interval: "month" as const,
    type: "subscription" as const,
    tier: "solo_founder",
  },
  ENTERPRISE_CEO: {
    name: "ARCH Enterprise CEO",
    description: "Full Agentic Operating Model with unlimited agents and 5% value capture.",
    priceAmount: 99900, // $999.00 in cents
    currency: "usd",
    interval: "month" as const,
    type: "subscription" as const,
    tier: "enterprise",
  },
  BLUEPRINT_CONTENT_AGENCY: {
    name: "Content Marketing Agency Blueprint",
    description: "Pre-built zero-human content marketing agency with 5 agents.",
    priceAmount: 49900, // $499.00 one-time
    currency: "usd",
    type: "one_time" as const,
    tier: "blueprint",
  },
  BLUEPRINT_ECOMMERCE: {
    name: "E-Commerce Operator Blueprint",
    description: "Autonomous e-commerce operations with inventory, pricing, and fulfillment agents.",
    priceAmount: 79900, // $799.00 one-time
    currency: "usd",
    type: "one_time" as const,
    tier: "blueprint",
  },
  BLUEPRINT_YOUTUBE: {
    name: "YouTube Factory Blueprint",
    description: "End-to-end YouTube content production with research, scripting, and optimization agents.",
    priceAmount: 59900, // $599.00 one-time
    currency: "usd",
    type: "one_time" as const,
    tier: "blueprint",
  },
} as const;

export type ProductKey = keyof typeof PRODUCTS;
