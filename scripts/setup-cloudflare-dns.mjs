#!/usr/bin/env node

/**
 * Cloudflare DNS Setup Script
 * Adds MX, SPF, DMARC, and CNAME records for bot@opencommand.co email infrastructure
 * 
 * Usage: node scripts/setup-cloudflare-dns.mjs
 * 
 * Requires:
 * - CLOUDFLARE_API_TOKEN environment variable
 * - CLOUDFLARE_ZONE_ID environment variable (for opencommand.co)
 */

import fetch from "node-fetch";

const API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const ZONE_ID = process.env.CLOUDFLARE_ZONE_ID;
const DOMAIN = "opencommand.co";

if (!API_TOKEN || !ZONE_ID) {
  console.error("❌ Missing required environment variables:");
  console.error("   - CLOUDFLARE_API_TOKEN");
  console.error("   - CLOUDFLARE_ZONE_ID");
  process.exit(1);
}

const BASE_URL = `https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records`;

async function createDNSRecord(record) {
  console.log(`📝 Creating ${record.type} record: ${record.name}`);

  try {
    const response = await fetch(BASE_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(record),
    });

    const data = await response.json();

    if (!data.success) {
      console.error(`   ❌ Failed:`, data.errors);
      return false;
    }

    console.log(`   ✅ Created: ${data.result.id}`);
    return true;
  } catch (error) {
    console.error(`   ❌ Error:`, error.message);
    return false;
  }
}

async function setupDNS() {
  console.log(`🚀 Setting up DNS records for ${DOMAIN}\n`);

  const records = [
    // MX Record - Primary mail server
    {
      type: "MX",
      name: DOMAIN,
      content: "mail.opencommand.co",
      priority: 10,
      ttl: 3600,
    },

    // SPF Record - Authorize mail servers
    {
      type: "TXT",
      name: DOMAIN,
      content: 'v=spf1 include:sendgrid.net ~all',
      ttl: 3600,
    },

    // DMARC Record - Email authentication policy
    {
      type: "TXT",
      name: "_dmarc",
      content: 'v=DMARC1; p=none; rua=mailto:postmaster@opencommand.co',
      ttl: 3600,
    },

    // DKIM Record (placeholder - actual key from SendGrid)
    {
      type: "TXT",
      name: "default._domainkey",
      content: "v=DKIM1; k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDL...",
      ttl: 3600,
    },

    // CNAME for mail server (if using SendGrid)
    {
      type: "CNAME",
      name: "mail",
      content: "sendgrid.net",
      ttl: 3600,
    },

    // Verification record for Resend (optional)
    {
      type: "TXT",
      name: "resend",
      content: "v=resend",
      ttl: 3600,
    },
  ];

  let successCount = 0;
  let failureCount = 0;

  for (const record of records) {
    const success = await createDNSRecord(record);
    if (success) {
      successCount++;
    } else {
      failureCount++;
    }
    // Rate limiting - wait between requests
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  console.log(`\n📊 Summary:`);
  console.log(`   ✅ Created: ${successCount}`);
  console.log(`   ❌ Failed: ${failureCount}`);

  if (failureCount === 0) {
    console.log(`\n🎉 DNS setup complete! Email infrastructure is ready.`);
    console.log(`\n📧 Email configuration:`);
    console.log(`   Domain: ${DOMAIN}`);
    console.log(`   From: sig-{dealer_slug}@bot.${DOMAIN}`);
    console.log(`   Example: sig-johnson-tractor@bot.${DOMAIN}`);
  } else {
    console.log(`\n⚠️  Some records failed. Please check the errors above.`);
    process.exit(1);
  }
}

// Run setup
setupDNS().catch((error) => {
  console.error("❌ Fatal error:", error);
  process.exit(1);
});
