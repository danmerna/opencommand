import { getDb } from "../../db";
import { completedWork, emails } from "../../../drizzle/schema";
import { eq } from "drizzle-orm";

/**
 * ROI Attribution Service
 * Connects email responses to sales outcomes and calculates ROI
 */

export interface ROIMetrics {
  totalResponsesSent: number;
  totalOpens: number;
  totalClicks: number;
  totalReplies: number;
  totalSalesGenerated: number;
  totalRevenueGenerated: number;
  openRate: number; // percentage
  clickRate: number; // percentage
  replyRate: number; // percentage
  conversionRate: number; // percentage
  revenuePerResponse: number;
  roiPercentage: number;
}

/**
 * Calculate ROI metrics for a company
 */
export async function calculateROIMetrics(companyId: number): Promise<ROIMetrics> {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");

  // Get all completed work items for the company
  const completedItems = await db.select().from(completedWork).execute();

  let totalResponsesSent = 0;
  let totalOpens = 0;
  let totalClicks = 0;
  let totalReplies = 0;
  let totalSalesGenerated = 0;
  let totalRevenueGenerated = 0;

  for (const item of completedItems as any[]) {
    const metadata = JSON.parse(item.metadataJson || "{}");
    if (metadata.companyId && metadata.companyId !== companyId) continue;

    totalResponsesSent += 1;
    totalOpens += metadata.opens || 0;
    totalClicks += metadata.clicks || 0;
    totalReplies += metadata.replies || 0;
    totalSalesGenerated += metadata.sales_generated ? 1 : 0;
    totalRevenueGenerated += parseFloat(metadata.revenue_generated || "0");
  }

  // Calculate rates
  const openRate = totalResponsesSent > 0 ? (totalOpens / totalResponsesSent) * 100 : 0;
  const clickRate = totalOpens > 0 ? (totalClicks / totalOpens) * 100 : 0;
  const replyRate = totalClicks > 0 ? (totalReplies / totalClicks) * 100 : 0;
  const conversionRate = totalResponsesSent > 0 ? (totalSalesGenerated / totalResponsesSent) * 100 : 0;
  const revenuePerResponse = totalResponsesSent > 0 ? totalRevenueGenerated / totalResponsesSent : 0;

  // Estimate cost per response (LLM + email infrastructure)
  const costPerResponse = 0.50; // $0.50 per response
  const totalCost = totalResponsesSent * costPerResponse;
  const roiPercentage = totalCost > 0 ? ((totalRevenueGenerated - totalCost) / totalCost) * 100 : 0;

  return {
    totalResponsesSent,
    totalOpens,
    totalClicks,
    totalReplies,
    totalSalesGenerated,
    totalRevenueGenerated,
    openRate: Math.round(openRate * 100) / 100,
    clickRate: Math.round(clickRate * 100) / 100,
    replyRate: Math.round(replyRate * 100) / 100,
    conversionRate: Math.round(conversionRate * 100) / 100,
    revenuePerResponse: Math.round(revenuePerResponse * 100) / 100,
    roiPercentage: Math.round(roiPercentage * 100) / 100,
  };
}

/**
 * Get ROI metrics by time period
 */
export async function getROIByPeriod(
  companyId: number,
  period: "daily" | "weekly" | "monthly"
): Promise<Record<string, ROIMetrics>> {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");

  const completedItems = await db.select().from(completedWork).execute();

  const periodMap: Record<string, ROIMetrics> = {};

  for (const item of completedItems as any[]) {
    const metadata = JSON.parse(item.metadataJson || "{}");
    if (metadata.companyId && metadata.companyId !== companyId) continue;

    const date = new Date(item.createdAt);
    let periodKey: string;

    if (period === "daily") {
      periodKey = date.toISOString().split("T")[0];
    } else if (period === "weekly") {
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      periodKey = weekStart.toISOString().split("T")[0];
    } else {
      periodKey = date.toISOString().slice(0, 7);
    }

    if (!periodMap[periodKey]) {
      periodMap[periodKey] = {
        totalResponsesSent: 0,
        totalOpens: 0,
        totalClicks: 0,
        totalReplies: 0,
        totalSalesGenerated: 0,
        totalRevenueGenerated: 0,
        openRate: 0,
        clickRate: 0,
        replyRate: 0,
        conversionRate: 0,
        revenuePerResponse: 0,
        roiPercentage: 0,
      };
    }

    const metrics = periodMap[periodKey];
    metrics.totalResponsesSent += 1;
    metrics.totalOpens += metadata.opens || 0;
    metrics.totalClicks += metadata.clicks || 0;
    metrics.totalReplies += metadata.replies || 0;
    metrics.totalSalesGenerated += metadata.sales_generated ? 1 : 0;
    metrics.totalRevenueGenerated += parseFloat(metadata.revenue_generated || "0");

    // Recalculate rates
    metrics.openRate = metrics.totalResponsesSent > 0 ? (metrics.totalOpens / metrics.totalResponsesSent) * 100 : 0;
    metrics.clickRate = metrics.totalOpens > 0 ? (metrics.totalClicks / metrics.totalOpens) * 100 : 0;
    metrics.replyRate = metrics.totalClicks > 0 ? (metrics.totalReplies / metrics.totalClicks) * 100 : 0;
    metrics.conversionRate = metrics.totalResponsesSent > 0 ? (metrics.totalSalesGenerated / metrics.totalResponsesSent) * 100 : 0;
    metrics.revenuePerResponse = metrics.totalResponsesSent > 0 ? metrics.totalRevenueGenerated / metrics.totalResponsesSent : 0;

    const costPerResponse = 0.50;
    const totalCost = metrics.totalResponsesSent * costPerResponse;
    metrics.roiPercentage = totalCost > 0 ? ((metrics.totalRevenueGenerated - totalCost) / totalCost) * 100 : 0;
  }

  return periodMap;
}

/**
 * Get ROI by response template
 */
export async function getROIByTemplate(companyId: number): Promise<Record<string, ROIMetrics>> {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");

  const completedItems = await db.select().from(completedWork).execute();

  const templateMap: Record<string, ROIMetrics> = {};

  for (const item of completedItems as any[]) {
    const metadata = JSON.parse(item.metadataJson || "{}");
    if (metadata.companyId && metadata.companyId !== companyId) continue;

    const templateName = metadata.template_name || "Unknown";

    if (!templateMap[templateName]) {
      templateMap[templateName] = {
        totalResponsesSent: 0,
        totalOpens: 0,
        totalClicks: 0,
        totalReplies: 0,
        totalSalesGenerated: 0,
        totalRevenueGenerated: 0,
        openRate: 0,
        clickRate: 0,
        replyRate: 0,
        conversionRate: 0,
        revenuePerResponse: 0,
        roiPercentage: 0,
      };
    }

    const metrics = templateMap[templateName];
    metrics.totalResponsesSent += 1;
    metrics.totalOpens += metadata.opens || 0;
    metrics.totalClicks += metadata.clicks || 0;
    metrics.totalReplies += metadata.replies || 0;
    metrics.totalSalesGenerated += metadata.sales_generated ? 1 : 0;
    metrics.totalRevenueGenerated += parseFloat(metadata.revenue_generated || "0");

    // Recalculate rates
    metrics.openRate = metrics.totalResponsesSent > 0 ? (metrics.totalOpens / metrics.totalResponsesSent) * 100 : 0;
    metrics.clickRate = metrics.totalOpens > 0 ? (metrics.totalClicks / metrics.totalOpens) * 100 : 0;
    metrics.replyRate = metrics.totalClicks > 0 ? (metrics.totalReplies / metrics.totalClicks) * 100 : 0;
    metrics.conversionRate = metrics.totalResponsesSent > 0 ? (metrics.totalSalesGenerated / metrics.totalResponsesSent) * 100 : 0;
    metrics.revenuePerResponse = metrics.totalResponsesSent > 0 ? metrics.totalRevenueGenerated / metrics.totalResponsesSent : 0;

    const costPerResponse = 0.50;
    const totalCost = metrics.totalResponsesSent * costPerResponse;
    metrics.roiPercentage = totalCost > 0 ? ((metrics.totalRevenueGenerated - totalCost) / totalCost) * 100 : 0;
  }

  return templateMap;
}

/**
 * Get ROI by buyer segment
 */
export async function getROIByBuyerSegment(companyId: number): Promise<Record<string, ROIMetrics>> {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");

  const completedItems = await db.select().from(completedWork).execute();

  const segmentMap: Record<string, ROIMetrics> = {};

  for (const item of completedItems as any[]) {
    const metadata = JSON.parse(item.metadataJson || "{}");
    if (metadata.companyId && metadata.companyId !== companyId) continue;

    const segment = metadata.buyer_segment || "Unknown";

    if (!segmentMap[segment]) {
      segmentMap[segment] = {
        totalResponsesSent: 0,
        totalOpens: 0,
        totalClicks: 0,
        totalReplies: 0,
        totalSalesGenerated: 0,
        totalRevenueGenerated: 0,
        openRate: 0,
        clickRate: 0,
        replyRate: 0,
        conversionRate: 0,
        revenuePerResponse: 0,
        roiPercentage: 0,
      };
    }

    const metrics = segmentMap[segment];
    metrics.totalResponsesSent += 1;
    metrics.totalOpens += metadata.opens || 0;
    metrics.totalClicks += metadata.clicks || 0;
    metrics.totalReplies += metadata.replies || 0;
    metrics.totalSalesGenerated += metadata.sales_generated ? 1 : 0;
    metrics.totalRevenueGenerated += parseFloat(metadata.revenue_generated || "0");

    // Recalculate rates
    metrics.openRate = metrics.totalResponsesSent > 0 ? (metrics.totalOpens / metrics.totalResponsesSent) * 100 : 0;
    metrics.clickRate = metrics.totalOpens > 0 ? (metrics.totalClicks / metrics.totalOpens) * 100 : 0;
    metrics.replyRate = metrics.totalClicks > 0 ? (metrics.totalReplies / metrics.totalClicks) * 100 : 0;
    metrics.conversionRate = metrics.totalResponsesSent > 0 ? (metrics.totalSalesGenerated / metrics.totalResponsesSent) * 100 : 0;
    metrics.revenuePerResponse = metrics.totalResponsesSent > 0 ? metrics.totalRevenueGenerated / metrics.totalResponsesSent : 0;

    const costPerResponse = 0.50;
    const totalCost = metrics.totalResponsesSent * costPerResponse;
    metrics.roiPercentage = totalCost > 0 ? ((metrics.totalRevenueGenerated - totalCost) / totalCost) * 100 : 0;
  }

  return segmentMap;
}
