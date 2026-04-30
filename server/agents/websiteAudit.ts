/**
 * Website Audit Engine
 * Runs background analysis on a company's website during onboarding.
 * Includes: metadata scrape, technical SEO, social presence, tech stack, LLM content analysis.
 */
import * as cheerio from "cheerio";
import { invokeLLM } from "../_core/llm";
import {
  createWebsiteAudit,
  updateWebsiteAudit,
  getWebsiteAuditByCompanyId,
} from "../db";

// ─── Types ──────────────────────────────────────────────────────────────────
interface ScrapeResult {
  html: string;
  headers: Record<string, string>;
  responseTimeMs: number;
  finalUrl: string;
  statusCode: number;
}

interface MetadataResult {
  pageTitle: string | null;
  metaDescription: string | null;
  ogTags: Record<string, string>;
  canonicalUrl: string | null;
  language: string | null;
  favicon: string | null;
}

interface TechnicalSeoResult {
  hasRobotsTxt: boolean;
  hasSitemapXml: boolean;
  isHttps: boolean;
  responseTimeMs: number;
  securityHeaders: Record<string, string | boolean>;
  seoIssues: string[];
}

interface SocialLinks {
  twitter?: string;
  linkedin?: string;
  facebook?: string;
  instagram?: string;
  youtube?: string;
  tiktok?: string;
  github?: string;
  [key: string]: string | undefined;
}

interface TechStack {
  frameworks: string[];
  analytics: string[];
  adPixels: string[];
  crm: string[];
  other: string[];
}

interface LlmAnalysis {
  valueProposition: string;
  targetAudience: string;
  competitivePositioning: string;
  toneOfVoice: string;
  keyProducts: string[];
  likelyCompetitors: string[];
  marketInsights: string;
}

// ─── 1. Website Scraper ─────────────────────────────────────────────────────
async function scrapeWebsite(url: string): Promise<ScrapeResult> {
  const startTime = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "OpenCommand-AuditBot/1.0 (+https://opencommand.co)",
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
    });

    const html = await response.text();
    const responseTimeMs = Date.now() - startTime;

    const headers: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      headers[key.toLowerCase()] = value;
    });

    return {
      html,
      headers,
      responseTimeMs,
      finalUrl: response.url,
      statusCode: response.status,
    };
  } finally {
    clearTimeout(timeout);
  }
}

// ─── 2. Metadata Extractor ──────────────────────────────────────────────────
function extractMetadata(html: string, baseUrl: string): MetadataResult {
  const $ = cheerio.load(html);

  const ogTags: Record<string, string> = {};
  $('meta[property^="og:"]').each((_, el) => {
    const prop = $(el).attr("property")?.replace("og:", "") ?? "";
    const content = $(el).attr("content") ?? "";
    if (prop && content) ogTags[prop] = content;
  });

  let favicon =
    $('link[rel="icon"]').attr("href") ??
    $('link[rel="shortcut icon"]').attr("href") ??
    null;
  if (favicon && !favicon.startsWith("http")) {
    try {
      favicon = new URL(favicon, baseUrl).href;
    } catch {
      /* ignore */
    }
  }

  return {
    pageTitle: $("title").first().text().trim() || null,
    metaDescription:
      $('meta[name="description"]').attr("content")?.trim() ?? null,
    ogTags,
    canonicalUrl: $('link[rel="canonical"]').attr("href") ?? null,
    language: $("html").attr("lang") ?? null,
    favicon,
  };
}

// ─── 3. Technical SEO Checker ───────────────────────────────────────────────
async function checkTechnicalSeo(
  url: string,
  html: string,
  headers: Record<string, string>,
  responseTimeMs: number
): Promise<TechnicalSeoResult> {
  const $ = cheerio.load(html);
  const parsedUrl = new URL(url);
  const baseUrl = `${parsedUrl.protocol}//${parsedUrl.host}`;

  // Check robots.txt and sitemap.xml in parallel
  const [robotsRes, sitemapRes] = await Promise.allSettled([
    fetch(`${baseUrl}/robots.txt`, {
      signal: AbortSignal.timeout(5000),
    }).then((r) => r.ok),
    fetch(`${baseUrl}/sitemap.xml`, {
      signal: AbortSignal.timeout(5000),
    }).then((r) => r.ok),
  ]);

  const hasRobotsTxt =
    robotsRes.status === "fulfilled" ? robotsRes.value : false;
  const hasSitemapXml =
    sitemapRes.status === "fulfilled" ? sitemapRes.value : false;
  const isHttps = parsedUrl.protocol === "https:";

  // Security headers
  const securityHeaders: Record<string, string | boolean> = {
    hsts: !!headers["strict-transport-security"],
    xFrameOptions: headers["x-frame-options"] ?? false,
    xContentTypeOptions: headers["x-content-type-options"] ?? false,
    contentSecurityPolicy: !!headers["content-security-policy"],
    xXssProtection: headers["x-xss-protection"] ?? false,
  };

  // SEO issues
  const seoIssues: string[] = [];
  const title = $("title").first().text().trim();
  if (!title) seoIssues.push("Missing page title");
  else if (title.length > 60)
    seoIssues.push(`Title too long (${title.length} chars, recommended <60)`);
  else if (title.length < 10)
    seoIssues.push(`Title too short (${title.length} chars, recommended >10)`);

  const desc = $('meta[name="description"]').attr("content")?.trim();
  if (!desc) seoIssues.push("Missing meta description");
  else if (desc.length > 160)
    seoIssues.push(
      `Meta description too long (${desc.length} chars, recommended <160)`
    );

  if (!$('link[rel="canonical"]').length) seoIssues.push("Missing canonical URL");
  if (!$("html").attr("lang")) seoIssues.push("Missing lang attribute on <html>");
  if (!$("h1").length) seoIssues.push("Missing H1 tag");
  if ($("h1").length > 1) seoIssues.push(`Multiple H1 tags found (${$("h1").length})`);
  if (!$('meta[property="og:title"]').length) seoIssues.push("Missing Open Graph title");
  if (!$('meta[property="og:description"]').length) seoIssues.push("Missing Open Graph description");
  if (!$('meta[property="og:image"]').length) seoIssues.push("Missing Open Graph image");
  if (!isHttps) seoIssues.push("Site not served over HTTPS");
  if (!hasRobotsTxt) seoIssues.push("Missing robots.txt");
  if (!hasSitemapXml) seoIssues.push("Missing sitemap.xml");
  if (responseTimeMs > 3000) seoIssues.push(`Slow server response (${responseTimeMs}ms, recommended <3000ms)`);
  if (!headers["strict-transport-security"]) seoIssues.push("Missing HSTS header");

  // Check for images without alt text
  const imgsWithoutAlt = $("img").filter((_, el) => !$(el).attr("alt")).length;
  if (imgsWithoutAlt > 0) seoIssues.push(`${imgsWithoutAlt} image(s) missing alt text`);

  return {
    hasRobotsTxt,
    hasSitemapXml,
    isHttps,
    responseTimeMs,
    securityHeaders,
    seoIssues,
  };
}

// ─── 4. Social Presence Detector ────────────────────────────────────────────
function detectSocialLinks(html: string): SocialLinks {
  const $ = cheerio.load(html);
  const links: SocialLinks = {};

  const patterns: Record<string, RegExp> = {
    twitter: /(?:twitter\.com|x\.com)\/[a-zA-Z0-9_]+/i,
    linkedin: /linkedin\.com\/(?:company|in)\/[a-zA-Z0-9_-]+/i,
    facebook: /facebook\.com\/[a-zA-Z0-9._-]+/i,
    instagram: /instagram\.com\/[a-zA-Z0-9._]+/i,
    youtube: /youtube\.com\/(?:@|channel\/|c\/)[a-zA-Z0-9_-]+/i,
    tiktok: /tiktok\.com\/@[a-zA-Z0-9._]+/i,
    github: /github\.com\/[a-zA-Z0-9_-]+/i,
  };

  $("a[href]").each((_, el) => {
    const href = $(el).attr("href") ?? "";
    for (const [platform, regex] of Object.entries(patterns)) {
      if (!links[platform] && regex.test(href)) {
        links[platform] = href;
      }
    }
  });

  return links;
}

// ─── 5. Tech Stack Detector ─────────────────────────────────────────────────
function detectTechStack(
  html: string,
  headers: Record<string, string>
): TechStack {
  const result: TechStack = {
    frameworks: [],
    analytics: [],
    adPixels: [],
    crm: [],
    other: [],
  };

  const lowerHtml = html.toLowerCase();

  // Frameworks
  const frameworkSignatures: Record<string, string[]> = {
    React: ["react", "__next", "_next/static", "reactroot"],
    "Next.js": ["__next", "_next/static", "next/router"],
    WordPress: ["wp-content", "wp-includes", "wordpress"],
    Shopify: ["shopify", "cdn.shopify.com", "myshopify"],
    Squarespace: ["squarespace", "static1.squarespace.com"],
    Wix: ["wix.com", "parastorage.com", "wixstatic.com"],
    Webflow: ["webflow", "assets.website-files.com"],
    Vue: ["vue", "__vue__", "vue-app"],
    Angular: ["ng-version", "angular"],
    Svelte: ["__svelte", "svelte"],
    Gatsby: ["gatsby", "gatsby-image"],
    Framer: ["framer", "framerusercontent.com"],
  };

  for (const [name, sigs] of Object.entries(frameworkSignatures)) {
    if (sigs.some((sig) => lowerHtml.includes(sig))) {
      result.frameworks.push(name);
    }
  }

  // Server headers
  const server = headers["x-powered-by"] ?? headers["server"] ?? "";
  if (server) result.other.push(`Server: ${server}`);

  // Analytics
  const analyticsSignatures: Record<string, string[]> = {
    "Google Analytics (GA4)": ["gtag", "googletagmanager", "g-tag", "ga4"],
    "Google Analytics (UA)": ["ua-", "google-analytics.com/analytics"],
    Segment: ["segment.com/analytics", "analytics.js", "cdn.segment.com"],
    Hotjar: ["hotjar", "hj(", "static.hotjar.com"],
    Mixpanel: ["mixpanel", "cdn.mxpnl.com"],
    Amplitude: ["amplitude", "cdn.amplitude.com"],
    Plausible: ["plausible.io"],
    Posthog: ["posthog", "app.posthog.com"],
    Heap: ["heap", "cdn.heapanalytics.com"],
    FullStory: ["fullstory", "fullstory.com"],
    Clarity: ["clarity.ms"],
  };

  for (const [name, sigs] of Object.entries(analyticsSignatures)) {
    if (sigs.some((sig) => lowerHtml.includes(sig))) {
      result.analytics.push(name);
    }
  }

  // Ad pixels
  const adPixelSignatures: Record<string, string[]> = {
    "Meta Pixel": ["fbq(", "facebook.com/tr", "connect.facebook.net/en_US/fbevents"],
    "Google Ads": ["googleads", "google_conversion", "gtag('config', 'aw-"],
    "TikTok Pixel": ["tiktok", "analytics.tiktok.com"],
    "LinkedIn Insight": ["linkedin.com/insight", "snap.licdn.com"],
    "Twitter Pixel": ["twq(", "static.ads-twitter.com"],
    "Pinterest Tag": ["pintrk(", "s.pinimg.com/ct/core.js"],
  };

  for (const [name, sigs] of Object.entries(adPixelSignatures)) {
    if (sigs.some((sig) => lowerHtml.includes(sig))) {
      result.adPixels.push(name);
    }
  }

  // CRM / Chat widgets
  const crmSignatures: Record<string, string[]> = {
    HubSpot: ["hubspot", "js.hs-scripts.com", "hs-banner.com"],
    Intercom: ["intercom", "widget.intercom.io"],
    Drift: ["drift", "js.driftt.com"],
    Zendesk: ["zendesk", "zdassets.com"],
    Crisp: ["crisp", "client.crisp.chat"],
    LiveChat: ["livechat", "cdn.livechatinc.com"],
    Freshdesk: ["freshdesk", "freshchat"],
    Calendly: ["calendly", "assets.calendly.com"],
    Typeform: ["typeform", "embed.typeform.com"],
  };

  for (const [name, sigs] of Object.entries(crmSignatures)) {
    if (sigs.some((sig) => lowerHtml.includes(sig))) {
      result.crm.push(name);
    }
  }

  return result;
}

// ─── 6. LLM Content Analyzer ───────────────────────────────────────────────
async function analyzContentWithLlm(
  html: string,
  metadata: MetadataResult,
  techStack: TechStack,
  socialLinks: SocialLinks,
  companyName: string,
  industry: string
): Promise<LlmAnalysis> {
  const $ = cheerio.load(html);

  // Extract visible text (limit to ~4000 chars for LLM context)
  $("script, style, noscript, svg, iframe").remove();
  let bodyText = $("body").text().replace(/\s+/g, " ").trim();
  if (bodyText.length > 4000) bodyText = bodyText.slice(0, 4000) + "...";

  const prompt = `Analyze this company website and provide a strategic business intelligence report.

Company: ${companyName}
Industry: ${industry || "Unknown"}
Page Title: ${metadata.pageTitle || "N/A"}
Meta Description: ${metadata.metaDescription || "N/A"}
Tech Stack: ${techStack.frameworks.join(", ") || "Unknown"}
Analytics: ${techStack.analytics.join(", ") || "None detected"}
Ad Pixels: ${techStack.adPixels.join(", ") || "None detected"}
CRM/Chat: ${techStack.crm.join(", ") || "None detected"}
Social Presence: ${Object.keys(socialLinks).join(", ") || "None detected"}

Website Content:
${bodyText}

Provide a strategic analysis as a JSON object.`;

  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content:
            "You are a senior business analyst providing strategic website intelligence for executive decision-making. Be specific, data-driven, and actionable.",
        },
        { role: "user", content: prompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "website_analysis",
          strict: true,
          schema: {
            type: "object",
            properties: {
              valueProposition: {
                type: "string",
                description:
                  "Clear 1-2 sentence summary of what this company offers and why it matters",
              },
              targetAudience: {
                type: "string",
                description:
                  "Who this company serves — be specific about segments, roles, company sizes",
              },
              competitivePositioning: {
                type: "string",
                description:
                  "How they position against competitors, unique differentiators, market approach",
              },
              toneOfVoice: {
                type: "string",
                description:
                  "Brand voice characterization (e.g., professional, casual, technical, aspirational)",
              },
              keyProducts: {
                type: "array",
                items: { type: "string" },
                description: "Main products or services offered",
              },
              likelyCompetitors: {
                type: "array",
                items: { type: "string" },
                description:
                  "Likely competitors based on the website content and positioning",
              },
              marketInsights: {
                type: "string",
                description:
                  "Strategic observations about their market position, growth signals, and opportunities",
              },
            },
            required: [
              "valueProposition",
              "targetAudience",
              "competitivePositioning",
              "toneOfVoice",
              "keyProducts",
              "likelyCompetitors",
              "marketInsights",
            ],
            additionalProperties: false,
          },
        },
      },
    });

    const rawContent = response.choices?.[0]?.message?.content;
    if (!rawContent) throw new Error("Empty LLM response");
    const content = typeof rawContent === "string" ? rawContent : JSON.stringify(rawContent);
    return JSON.parse(content) as LlmAnalysis;
  } catch (error) {
    console.error("[WebsiteAudit] LLM analysis failed:", error);
    return {
      valueProposition: "Analysis unavailable",
      targetAudience: "Analysis unavailable",
      competitivePositioning: "Analysis unavailable",
      toneOfVoice: "Analysis unavailable",
      keyProducts: [],
      likelyCompetitors: [],
      marketInsights: "Analysis unavailable",
    };
  }
}

// ─── 7. Executive Summary Generator ────────────────────────────────────────
function generateExecutiveSummary(
  metadata: MetadataResult,
  seo: TechnicalSeoResult,
  socialLinks: SocialLinks,
  techStack: TechStack,
  llmAnalysis: LlmAnalysis
): string {
  const socialCount = Object.keys(socialLinks).length;
  const issueCount = seo.seoIssues.length;
  const techList = [
    ...techStack.frameworks,
    ...techStack.analytics,
    ...techStack.crm,
  ].join(", ");

  return `## Website Intelligence Report

**Value Proposition:** ${llmAnalysis.valueProposition}

**Target Audience:** ${llmAnalysis.targetAudience}

**Competitive Position:** ${llmAnalysis.competitivePositioning}

**Brand Tone:** ${llmAnalysis.toneOfVoice}

**Key Products/Services:** ${llmAnalysis.keyProducts.join(", ") || "Not identified"}

**Likely Competitors:** ${llmAnalysis.likelyCompetitors.join(", ") || "Not identified"}

### Technical Profile
- **Performance:** ${seo.responseTimeMs}ms response time ${seo.responseTimeMs < 1000 ? "(Good)" : seo.responseTimeMs < 3000 ? "(Acceptable)" : "(Needs improvement)"}
- **SEO Health:** ${issueCount === 0 ? "Excellent — no issues found" : `${issueCount} issue(s) detected`}
- **HTTPS:** ${seo.isHttps ? "Yes" : "No — critical security gap"}
- **Tech Stack:** ${techList || "Not detected"}
- **Social Presence:** ${socialCount} platform(s) detected
- **Ad Pixels:** ${techStack.adPixels.length > 0 ? techStack.adPixels.join(", ") : "None detected"}

### Market Insights
${llmAnalysis.marketInsights}`;
}

// ─── Main Orchestrator ──────────────────────────────────────────────────────
export async function runWebsiteAudit(params: {
  companyId: number;
  userId: number;
  url: string;
  companyName: string;
  industry: string;
}): Promise<{ auditId: number | null; success: boolean; error?: string }> {
  const { companyId, userId, url, companyName, industry } = params;

  // Normalize URL
  let normalizedUrl = url.trim();
  if (
    !normalizedUrl.startsWith("http://") &&
    !normalizedUrl.startsWith("https://")
  ) {
    normalizedUrl = `https://${normalizedUrl}`;
  }

  // Check for existing audit
  const existing = await getWebsiteAuditByCompanyId(companyId);
  if (existing && existing.status === "complete") {
    return { auditId: existing.id, success: true };
  }

  // Create audit record
  await createWebsiteAudit({
    companyId,
    userId,
    url: normalizedUrl,
    status: "pending",
  });

  const audit = await getWebsiteAuditByCompanyId(companyId);
  if (!audit) return { auditId: null, success: false, error: "Failed to create audit record" };
  const auditId = audit.id;

  try {
    // Phase 1: Scrape
    await updateWebsiteAudit(auditId, { status: "scraping" });
    const scrapeResult = await scrapeWebsite(normalizedUrl);

    // Phase 2: Extract all data in parallel
    await updateWebsiteAudit(auditId, { status: "analyzing" });

    const metadata = extractMetadata(scrapeResult.html, normalizedUrl);
    const socialLinks = detectSocialLinks(scrapeResult.html);
    const techStack = detectTechStack(scrapeResult.html, scrapeResult.headers);

    const [seo, llmAnalysis] = await Promise.all([
      checkTechnicalSeo(
        normalizedUrl,
        scrapeResult.html,
        scrapeResult.headers,
        scrapeResult.responseTimeMs
      ),
      analyzContentWithLlm(
        scrapeResult.html,
        metadata,
        techStack,
        socialLinks,
        companyName,
        industry
      ),
    ]);

    // Phase 3: Generate executive summary
    const executiveSummary = generateExecutiveSummary(
      metadata,
      seo,
      socialLinks,
      techStack,
      llmAnalysis
    );

    // Phase 4: Store everything
    await updateWebsiteAudit(auditId, {
      status: "complete",
      pageTitle: metadata.pageTitle,
      metaDescription: metadata.metaDescription,
      ogTags: metadata.ogTags,
      canonicalUrl: metadata.canonicalUrl,
      language: metadata.language,
      favicon: metadata.favicon,
      hasRobotsTxt: seo.hasRobotsTxt,
      hasSitemapXml: seo.hasSitemapXml,
      isHttps: seo.isHttps,
      responseTimeMs: seo.responseTimeMs,
      securityHeaders: seo.securityHeaders,
      seoIssues: seo.seoIssues,
      socialLinks: socialLinks as any,
      detectedTech: techStack,
      llmAnalysis: llmAnalysis as any,
      executiveSummary,
      completedAt: new Date(),
    });

    console.log(
      `[WebsiteAudit] Completed audit for ${normalizedUrl} (company ${companyId})`
    );
    return { auditId, success: true };
  } catch (error: any) {
    console.error(`[WebsiteAudit] Failed for ${normalizedUrl}:`, error);
    await updateWebsiteAudit(auditId, {
      status: "failed",
      errorMessage: error.message ?? "Unknown error",
    });
    return { auditId, success: false, error: error.message };
  }
}

// Re-export individual functions for testing
export {
  scrapeWebsite,
  extractMetadata,
  checkTechnicalSeo,
  detectSocialLinks,
  detectTechStack,
  analyzContentWithLlm as analyzeContentWithLlm,
  generateExecutiveSummary,
};
