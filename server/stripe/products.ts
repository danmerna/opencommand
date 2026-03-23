/**
 * OpenCommand Stripe Products & Prices
 * Centralized product definitions for marketplace checkout.
 */

export const PRODUCTS = {
  STARTER: {
    name: "Starter",
    description: "Perfect for individual operators getting started with autonomous AI execution.",
    priceAmount: 100, // $1.00 in cents
    currency: "usd",
    interval: "month" as const,
    type: "subscription" as const,
    tier: "starter",
  },
  PRO: {
    name: "Pro",
    description: "For high-performance operators who need full orchestration power and advanced context engineering.",
    priceAmount: 500, // $5.00 in cents
    currency: "usd",
    interval: "month" as const,
    type: "subscription" as const,
    tier: "pro",
  },
  SOLO_FOUNDER_CEO: {
    name: "Arch Solo-Founder CEO",
    description: "Your first autonomous executive hire. Orchestrates up to 3 subordinate agents.",
    priceAmount: 19900, // $199.00 in cents
    currency: "usd",
    interval: "month" as const,
    type: "subscription" as const,
    tier: "solo_founder",
  },
  ENTERPRISE_CEO: {
    name: "Arch Enterprise CEO",
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
