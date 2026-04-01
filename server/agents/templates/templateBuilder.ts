import { getDb } from "../../db";
import { emailTemplates } from "../../../drizzle/schema";
import { eq } from "drizzle-orm";

/**
 * Email Template Builder
 * Manages email templates with variable placeholders
 */

export interface EmailTemplate {
  id: number;
  name: string;
  description: string;
  category: "john_deere" | "kubota" | "financing" | "parts" | "service" | "custom";
  subject: string;
  body: string;
  variables: string[]; // e.g., ["buyer_name", "equipment_model", "price"]
  companyId: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Available template variables
 */
export const TEMPLATE_VARIABLES = {
  buyer_name: { label: "Buyer Name", example: "John Smith" },
  buyer_email: { label: "Buyer Email", example: "john@example.com" },
  buyer_phone: { label: "Buyer Phone", example: "(555) 123-4567" },
  equipment_model: { label: "Equipment Model", example: "John Deere 7530" },
  equipment_category: { label: "Equipment Category", example: "Tractor" },
  equipment_year: { label: "Equipment Year", example: "2022" },
  equipment_price: { label: "Equipment Price", example: "$45,000" },
  dealer_name: { label: "Dealer Name", example: "Johnson Tractor Sales" },
  dealer_contact: { label: "Dealer Contact", example: "Taylor Johnson" },
  quote_link: { label: "Quote Link", example: "https://quote.opencommand.co/..." },
  financing_rate: { label: "Financing Rate", example: "4.5%" },
  inventory_count: { label: "Inventory Count", example: "3 units in stock" },
  appointment_date: { label: "Appointment Date", example: "March 30, 2026" },
  company_name: { label: "Company Name", example: "OpenCommand" },
};

/**
 * Create a new email template
 */
export async function createEmailTemplate(
  companyId: number,
  template: Omit<EmailTemplate, "id" | "companyId" | "createdAt" | "updatedAt">
): Promise<EmailTemplate> {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");

  // Extract variables from body and subject
  const variablePattern = /\{\{(\w+)\}\}/g;
  const variables = new Set<string>();
  let match;

  while ((match = variablePattern.exec(template.body)) !== null) {
    variables.add(match[1]);
  }

  while ((match = variablePattern.exec(template.subject)) !== null) {
    variables.add(match[1]);
  }

  await db.insert(emailTemplates).values({
    name: template.name,
    description: template.description,
    category: template.category,
    subject: template.subject,
    body: template.body,
    variablesJson: JSON.stringify(Array.from(variables)),
    companyId,
  });

  // Fetch the created template
  const result = await db
    .select()
    .from(emailTemplates)
    .where(eq(emailTemplates.companyId, companyId))
    .limit(1)
    .execute();

  if (!result[0]) throw new Error("Failed to create template");

  return {
    id: result[0].id,
    name: result[0].name,
    description: result[0].description || "",
    category: result[0].category as EmailTemplate["category"],
    subject: result[0].subject,
    body: result[0].body,
    variables: Array.from(variables),
    companyId,
    createdAt: result[0].createdAt,
    updatedAt: result[0].updatedAt,
  };
}

/**
 * Get all templates for a company
 */
export async function getCompanyTemplates(companyId: number): Promise<EmailTemplate[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");

  const results = await db.select().from(emailTemplates).where(eq(emailTemplates.companyId, companyId)).execute();

  return results.map((t: any) => ({
    id: t.id,
    name: t.name,
    description: t.description,
    category: t.category as EmailTemplate["category"],
    subject: t.subject,
    body: t.body,
    variables: JSON.parse(t.variablesJson || "[]"),
    companyId: t.companyId,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  }));
}

/**
 * Get template by ID
 */
export async function getTemplate(id: number): Promise<EmailTemplate | null> {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");

  const result = await db.select().from(emailTemplates).where(eq(emailTemplates.id, id)).limit(1).execute();

  if (!result[0]) return null;

  const t = result[0];
  return {
    id: t.id,
    name: t.name,
    description: t.description || "",
    category: t.category as EmailTemplate["category"],
    subject: t.subject,
    body: t.body,
    variables: JSON.parse(t.variablesJson || "[]"),
    companyId: t.companyId,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  };
}

/**
 * Update email template
 */
export async function updateEmailTemplate(
  id: number,
  updates: Partial<Omit<EmailTemplate, "id" | "companyId" | "createdAt" | "updatedAt">>
): Promise<EmailTemplate> {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");

  // Extract variables if body or subject changed
  let variables: string[] | undefined;
  if (updates.body || updates.subject) {
    const variablePattern = /\{\{(\w+)\}\}/g;
    const variableSet = new Set<string>();
    let match;

    const textToSearch = (updates.body || "") + (updates.subject || "");
    while ((match = variablePattern.exec(textToSearch)) !== null) {
      variableSet.add(match[1]);
    }
    variables = Array.from(variableSet);
  }

  const updateData: any = { ...updates };
  if (variables) {
    updateData.variablesJson = JSON.stringify(variables);
  }

  await db.update(emailTemplates).set(updateData).where(eq(emailTemplates.id, id));

  const result = await db.select().from(emailTemplates).where(eq(emailTemplates.id, id)).limit(1).execute();
  if (!result[0]) throw new Error("Failed to update template");

  const t = result[0];
  return {
    id: t.id,
    name: t.name,
    description: t.description || "",
    category: t.category as EmailTemplate["category"],
    subject: t.subject,
    body: t.body,
    variables: JSON.parse(t.variablesJson || "[]"),
    companyId: t.companyId,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  };
}

/**
 * Delete email template
 */
export async function deleteEmailTemplate(id: number): Promise<boolean> {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");

  await db.delete(emailTemplates).where(eq(emailTemplates.id, id));
  return true;
}

/**
 * Render template with variables
 */
export function renderTemplate(
  template: EmailTemplate,
  variables: Record<string, string>
): { subject: string; body: string } {
  let subject = template.subject;
  let body = template.body;

  // Replace all {{variable}} with actual values
  for (const [key, value] of Object.entries(variables)) {
    const pattern = new RegExp(`\\{\\{${key}\\}\\}`, "g");
    subject = subject.replace(pattern, value);
    body = body.replace(pattern, value);
  }

  return { subject, body };
}

/**
 * Get template suggestions by category and equipment
 */
export async function getTemplateSuggestions(
  companyId: number,
  equipmentCategory: string
): Promise<EmailTemplate[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");

  // Map equipment to template category
  const categoryMap: Record<string, EmailTemplate["category"]> = {
    tractor: "john_deere",
    compact_tractor: "kubota",
    financing: "financing",
    parts: "parts",
    service: "service",
  };

  const templateCategory = categoryMap[equipmentCategory] || "custom";

  const results = await db
    .select()
    .from(emailTemplates)
    .where(eq(emailTemplates.companyId, companyId))
    .limit(5)
    .execute();

  return results.map((t: any) => ({
    id: t.id,
    name: t.name,
    description: t.description,
    category: t.category as EmailTemplate["category"],
    subject: t.subject,
    body: t.body,
    variables: JSON.parse(t.variablesJson || "[]"),
    companyId: t.companyId,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  }));
}
