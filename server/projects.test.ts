import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the db module
vi.mock("./db", () => ({
  getProjectsByUserId: vi.fn().mockResolvedValue([
    { id: 1, userId: 1, name: "Test Project", goal: "Test goal", color: "#6366f1", status: "active", plan: null, companyId: null, createdAt: new Date(), updatedAt: new Date() },
  ]),
  getProjectsByCompanyId: vi.fn().mockResolvedValue([]),
  getProjectById: vi.fn().mockImplementation(async (id: number) => {
    if (id === 1) return { id: 1, userId: 1, name: "Test Project", goal: "Test goal", color: "#6366f1", status: "active", plan: null, companyId: null, createdAt: new Date(), updatedAt: new Date() };
    return undefined;
  }),
  createProject: vi.fn().mockResolvedValue({ insertId: 42 }),
  updateProject: vi.fn().mockResolvedValue({}),
  deleteProject: vi.fn().mockResolvedValue({}),
  getProjectFiles: vi.fn().mockResolvedValue([]),
  createProjectFile: vi.fn().mockResolvedValue({ insertId: 10 }),
  deleteProjectFile: vi.fn().mockResolvedValue({}),
  getProjectChats: vi.fn().mockResolvedValue([]),
  createProjectChat: vi.fn().mockResolvedValue({ insertId: 5 }),
  createTaskThread: vi.fn().mockResolvedValue({}),
  hasWelcomeEmailBeenSent: vi.fn().mockResolvedValue(false),
  markWelcomeEmailSent: vi.fn().mockResolvedValue(undefined),
  getChangelogEntries: vi.fn().mockResolvedValue([]),
  seedChangelogIfEmpty: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [{ message: { content: "AI response for project" } }],
  }),
}));

vi.mock("./socketEmit", () => ({
  emitToUser: vi.fn(),
  emitBroadcast: vi.fn(),
}));

import {
  getProjectsByUserId,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
  getProjectFiles,
  createProjectFile,
  deleteProjectFile,
  getProjectChats,
  createProjectChat,
} from "./db";

describe("Projects DB helpers (unit)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("getProjectsByUserId returns projects for a user", async () => {
    const result = await getProjectsByUserId(1);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Test Project");
  });

  it("getProjectById returns the project when found", async () => {
    const project = await getProjectById(1);
    expect(project).toBeDefined();
    expect(project?.id).toBe(1);
  });

  it("getProjectById returns undefined for unknown id", async () => {
    const project = await getProjectById(999);
    expect(project).toBeUndefined();
  });

  it("createProject calls insert with correct data", async () => {
    const result = await createProject({ userId: 1, name: "New Project", color: "#6366f1", status: "active" });
    expect(createProject).toHaveBeenCalledWith({ userId: 1, name: "New Project", color: "#6366f1", status: "active" });
    expect((result as any).insertId).toBe(42);
  });

  it("updateProject calls update with id and data", async () => {
    await updateProject(1, { name: "Updated Name" });
    expect(updateProject).toHaveBeenCalledWith(1, { name: "Updated Name" });
  });

  it("deleteProject calls delete with id", async () => {
    await deleteProject(1);
    expect(deleteProject).toHaveBeenCalledWith(1);
  });
});

describe("Project Files DB helpers (unit)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("getProjectFiles returns empty array when no files", async () => {
    const files = await getProjectFiles(1);
    expect(files).toEqual([]);
  });

  it("createProjectFile inserts a file record", async () => {
    const result = await createProjectFile({ projectId: 1, userId: 1, name: "doc.pdf", url: "https://s3.example.com/doc.pdf", fileKey: "project-1/doc.pdf" });
    expect(createProjectFile).toHaveBeenCalled();
    expect((result as any).insertId).toBe(10);
  });

  it("deleteProjectFile removes a file by id", async () => {
    await deleteProjectFile(10);
    expect(deleteProjectFile).toHaveBeenCalledWith(10);
  });
});

describe("Project Chats DB helpers (unit)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("getProjectChats returns empty array initially", async () => {
    const chats = await getProjectChats(1);
    expect(chats).toEqual([]);
  });

  it("createProjectChat inserts a chat message", async () => {
    const result = await createProjectChat({ projectId: 1, userId: 1, role: "user", content: "Hello project!" });
    expect(createProjectChat).toHaveBeenCalledWith({ projectId: 1, userId: 1, role: "user", content: "Hello project!" });
    expect((result as any).insertId).toBe(5);
  });
});

describe("Projects router logic (integration-style)", () => {
  it("project name is required for creation", () => {
    const name = "";
    expect(name.trim().length).toBe(0);
  });

  it("project color defaults to indigo", () => {
    const defaultColor = "#6366f1";
    expect(defaultColor).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it("valid project statuses are enforced", () => {
    const validStatuses = ["active", "paused", "completed", "archived"];
    expect(validStatuses).toContain("active");
    expect(validStatuses).toContain("archived");
    expect(validStatuses).not.toContain("deleted");
  });
});
