"use client";

import {
  CSSProperties,
  KeyboardEvent,
  MutableRefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  AGENTS,
  EVENTS,
  MEMORY,
  PEOPLE,
  countWorkingAgents,
  getTopActiveAgents,
  type Agent,
} from "../../workstation/_client/data";
import { Icons } from "../../workstation/_client/icons";
import ResearchPanel, { type ResearchPanelHandle } from "./ResearchPanel";

// Default org slug for the doc-minimal demo. The /[org]/* routes have their
// own org-scoped instances; this is just the standalone playground.
const DEMO_ORG_SLUG = "atlas";

type BlockType =
  | "title"
  | "paragraph"
  | "heading"
  | "todo"
  | "routine"
  | "skill"
  | "skillCreator"
  | "decision"
  | "memory"
  | "agent"
  | "divider";

type Frequency = "Daily" | "Weekdays" | "Weekly" | "Monthly";
type SkillState = "ready" | "running" | "done";

type SkillSummary = {
  name: string;
  label: string;
  description: string;
  path?: string;
  command: string;
  provider: string;
};

type RoutineState = {
  title: string;
  frequency: Frequency;
  nextRun: string;
  owner: string;
};

type SkillDraft = {
  name: string;
  description: string;
  body: string;
  status: "draft" | "saving" | "created" | "error";
  message?: string;
  path?: string;
};

type DocBlock = {
  id: string;
  type: BlockType;
  text: string;
  done?: boolean;
  routine?: RoutineState;
  skill?: SkillSummary & { state: SkillState };
  draft?: SkillDraft;
};

type SlashCommand = {
  id: string;
  label: string;
  hint: string;
  aliases: string[];
  apply: (block: DocBlock, trailing: string) => DocBlock | null;
};

type FileTreeNode = {
  id: string;
  name: string;
  count?: number;
  expanded?: boolean;
  children?: FileTreeNode[];
};

type RailTab = "activity" | "agent" | "memory" | "context";
type AgentColorStyle = CSSProperties & { ["--agent-color"]?: string };

type LivingDocMode = "seeded" | "blank";

type LivingDocProps = {
  mode?: LivingDocMode;
  storageNamespace?: string;
  workspaceName?: string;
  projectName?: string;
  docName?: string;
  fileTreeTitle?: string;
  createdBy?: string;
  createdLabel?: string;
};

const defaultStorageNamespace = "neverzero.doc-minimal";

const initialFileTree: FileTreeNode[] = [
  {
    id: "readme",
    name: "README",
    expanded: true,
    children: [
      { id: "plan", name: "Launch plan", count: 12 },
      {
        id: "research-notes",
        name: "Research notes",
        expanded: true,
        children: [
          { id: "pricing-teardown", name: "Pricing teardown" },
          { id: "onboarding-flows", name: "Onboarding flows" },
        ],
      },
      { id: "decisions", name: "Decisions", count: 18 },
      { id: "deploys", name: "Deploys" },
    ],
  },
];

const blankFileTree: FileTreeNode[] = [
  {
    id: "documents",
    name: "Documents",
    expanded: true,
    children: [{ id: "untitled", name: "Untitled" }],
  },
];

const baseSkills: SkillSummary[] = [
  { name: "research", label: "Research", description: "Gather sources, summarize, and cite.", command: "/research", provider: "ZeroEntropy" },
  { name: "scaffold", label: "Scaffold", description: "Create a feature scaffold and test path.", command: "/scaffold", provider: "GStack" },
  { name: "review", label: "Review", description: "Critique a plan, diff, or decision.", command: "/review", provider: "The Hog" },
  { name: "deploy", label: "Deploy", description: "Prepare staging or production release steps.", command: "/deploy", provider: "Lightsprint" },
  { name: "remember", label: "Remember", description: "Pin a project fact to shared memory.", command: "/remember", provider: "Throughline" },
  { name: "recall", label: "Recall", description: "Retrieve forgotten work and decisions.", command: "/recall", provider: "GBrain" },
  { name: "compress", label: "Compress", description: "Collapse old context into a resume note.", command: "/compress", provider: "ZeroEntropy" },
  { name: "handoff", label: "Handoff", description: "Create a resume packet for another agent.", command: "/handoff", provider: "Throughline" },
  { name: "conflict-check", label: "Conflict Check", description: "Check whether another agent already owns this task.", command: "/conflict-check", provider: "Throughline" },
  { name: "qa", label: "QA", description: "Dogfood the current route and report failures.", command: "/qa", provider: "GStack" },
];

const seededBlocks: DocBlock[] = [
  { id: "title", type: "title", text: "Atlas - Q3 Launch" },
  { id: "sub", type: "paragraph", text: "The shared layer for AI-native work. Beta Jun 6. Public Jul 14." },
  { id: "mission-heading", type: "heading", text: "Mission" },
  {
    id: "mission-1",
    type: "paragraph",
    text:
      "Most teams treat AI as a tool you visit, not a layer you work inside. Throughline is one persistent document where humans and agents share plans, memory, decisions, code, and handoffs.",
  },
  { id: "mission-2", type: "paragraph", text: "Beta opens June 6th to 200 design partner teams. Public launch July 14th." },
  { id: "plan-heading", type: "heading", text: "Plan" },
  { id: "todo-1", type: "todo", done: true, text: "Lock pricing tiers - Solo, Team, Workspace" },
  { id: "todo-2", type: "todo", done: true, text: "Draft launch narrative" },
  { id: "todo-3", type: "todo", done: true, text: "Competitor matrix across 12 workspaces" },
  { id: "todo-4", type: "todo", done: false, text: "Land onboarding flow - show one real agent in under 60s" },
  { id: "routine-standup", type: "routine", text: "Daily agent standup", routine: { title: "Daily agent standup", frequency: "Daily", nextRun: "Tomorrow 9:00 AM", owner: "Atlas" } },
  {
    id: "skill-research",
    type: "skill",
    text: "Run research on onboarding consent friction",
    skill: { ...baseSkills[0], state: "running" },
  },
  { id: "memory-1", type: "memory", text: "Onboarding must show one real agent doing real work within 60 seconds." },
];

const blankBlocks: DocBlock[] = [
  { id: "title", type: "title", text: "" },
  { id: "blank-line", type: "paragraph", text: "" },
];

function uid(prefix = "block") {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}-${Date.now().toString(36)}`;
}

function agentNoun(count: number) {
  return count === 1 ? "agent" : "agents";
}

function normalizeCustomSkill(skill: Omit<SkillSummary, "provider">): SkillSummary {
  return { ...skill, provider: "Project" };
}

function readStoredBlocks(key: string, fallback: DocBlock[]) {
  if (typeof window === "undefined") return fallback;

  try {
    const stored = window.localStorage.getItem(key);
    if (!stored) return fallback;
    const parsed = JSON.parse(stored) as DocBlock[];
    if (!Array.isArray(parsed) || parsed.length === 0) return fallback;

    const hasTitle = parsed.some((block) => block.type === "title");
    return hasTitle ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function isFileTree(value: unknown): value is FileTreeNode[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((node) => {
      if (!node || typeof node !== "object") return false;
      const item = node as FileTreeNode;
      return (
        typeof item.id === "string" &&
        typeof item.name === "string" &&
        (!item.children || isFileTree(item.children))
      );
    })
  );
}

function readStoredFileTree(key: string, fallback: FileTreeNode[]) {
  if (typeof window === "undefined") return fallback;

  try {
    const stored = window.localStorage.getItem(key);
    if (!stored) return fallback;
    const parsed = JSON.parse(stored) as unknown;
    return isFileTree(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function mapFileTree(
  nodes: FileTreeNode[],
  id: string,
  update: (node: FileTreeNode) => FileTreeNode,
): FileTreeNode[] {
  return nodes.map((node) => {
    if (node.id === id) return update(node);
    if (!node.children) return node;
    return { ...node, children: mapFileTree(node.children, id, update) };
  });
}

function addFileNode(nodes: FileTreeNode[], parentId: string | null, node: FileTreeNode): FileTreeNode[] {
  if (!parentId) return [...nodes, node];

  return mapFileTree(nodes, parentId, (parent) => ({
    ...parent,
    expanded: true,
    children: [...(parent.children || []), node],
  }));
}

function removeFileNode(nodes: FileTreeNode[], id: string): FileTreeNode[] {
  return nodes
    .filter((node) => node.id !== id)
    .map((node) => (node.children ? { ...node, children: removeFileNode(node.children, id) } : node));
}

function makeFileNode(name = "Untitled"): FileTreeNode {
  return { id: uid("file"), name };
}

function collectFileNames(nodes: FileTreeNode[], names = new Set<string>()) {
  nodes.forEach((node) => {
    names.add(node.name);
    if (node.children) collectFileNames(node.children, names);
  });
  return names;
}

function nextFileName(nodes: FileTreeNode[]) {
  const names = collectFileNames(nodes);
  if (!names.has("New file")) return "New file";

  let index = 2;
  while (names.has(`New file ${index}`)) index += 1;
  return `New file ${index}`;
}

function firstFileId(nodes: FileTreeNode[]): string {
  return nodes[0]?.children?.[0]?.id || nodes[0]?.id || "plan";
}

export function LivingDoc({
  mode = "seeded",
  storageNamespace = defaultStorageNamespace,
  workspaceName = "Acme Robotics",
  projectName = "Atlas",
  docName = "Doc Minimal",
  fileTreeTitle = "Atlas - Q3 Launch",
  createdBy = "Sam Aoki",
  createdLabel = "May 03",
}: LivingDocProps = {}) {
  const initialBlocks = mode === "blank" ? blankBlocks : seededBlocks;
  const initialTree = mode === "blank" ? blankFileTree : initialFileTree;
  const blocksStorageKey = `${storageNamespace}.blocks.v1`;
  const fileTreeStorageKey = `${storageNamespace}.file-tree.v1`;

  const [blocks, setBlocks] = useState<DocBlock[]>(initialBlocks);
  const [fileTree, setFileTree] = useState<FileTreeNode[]>(initialTree);
  const [hasLoadedStoredState, setHasLoadedStoredState] = useState(false);
  const [customSkills, setCustomSkills] = useState<SkillSummary[]>([]);
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const [slashBlockId, setSlashBlockId] = useState<string | null>(null);
  const [slashQuery, setSlashQuery] = useState("");
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [railTab, setRailTab] = useState<RailTab>("agent");
  const [focusedAgent, setFocusedAgent] = useState(() => getTopActiveAgents(AGENTS)[0]?.id || AGENTS[0]?.id || "");
  const [activeDocId, setActiveDocId] = useState(() => firstFileId(initialTree));
  const [editingFileId, setEditingFileId] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState("now");
  const [activity, setActivity] = useState<string[]>([
    "Iris is reading onboarding notes",
    "Forge is waiting for the next claim",
    "Atlas has one routine armed",
  ]);
  const pendingFocusId = useRef<string | null>(null);
  const editorRefs = useRef<Record<string, HTMLElement | null>>({});
  const draftTextRef = useRef<Record<string, string>>({});

  useEffect(() => {
    const storedBlocks = readStoredBlocks(blocksStorageKey, initialBlocks);
    const storedFileTree = readStoredFileTree(fileTreeStorageKey, initialTree);
    setBlocks(storedBlocks);
    setFileTree(storedFileTree);
    setActiveDocId(firstFileId(storedFileTree));
    setHasLoadedStoredState(true);
  }, [blocksStorageKey, fileTreeStorageKey, initialBlocks, initialTree]);

  useEffect(() => {
    fetch("/api/skills")
      .then((response) => response.json())
      .then((data: { skills?: Omit<SkillSummary, "provider">[] }) => {
        if (Array.isArray(data.skills)) {
          setCustomSkills(data.skills.map(normalizeCustomSkill));
        }
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!hasLoadedStoredState) return;
    window.localStorage.setItem(blocksStorageKey, JSON.stringify(blocks));
    setLastSavedAt(new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }));
  }, [blocks, blocksStorageKey, hasLoadedStoredState]);

  useEffect(() => {
    if (!hasLoadedStoredState) return;
    window.localStorage.setItem(fileTreeStorageKey, JSON.stringify(fileTree));
  }, [fileTree, fileTreeStorageKey, hasLoadedStoredState]);

  useEffect(() => {
    const focusId = pendingFocusId.current;
    if (!focusId) return;
    pendingFocusId.current = null;
    requestAnimationFrame(() => {
      const target = editorRefs.current[focusId];
      target?.focus();
      placeCaretAtEnd(target);
    });
  }, [blocks]);

  useEffect(() => {
    const onKey = (event: globalThis.KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen((open) => !open);
      }

      if (event.key === "Escape") {
        setPaletteOpen(false);
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const skills = useMemo(() => [...baseSkills, ...customSkills], [customSkills]);
  const docAgents = useMemo(() => getTopActiveAgents(AGENTS), []);
  const registeredAgentCount = AGENTS.length;
  const workingAgentCount = countWorkingAgents(docAgents);

  const addActivity = useCallback((message: string) => {
    setActivity((items) => [message, ...items].slice(0, 8));
  }, []);

  const slashCommands = useMemo<SlashCommand[]>(
    () => [
      {
        id: "paragraph",
        label: "Text",
        hint: "Plain editable line",
        aliases: ["text", "p"],
        apply: (_block, trailing) => ({ id: uid("text"), type: "paragraph", text: trailing || "" }),
      },
      {
        id: "heading",
        label: "Heading",
        hint: "Section heading",
        aliases: ["h", "h2"],
        apply: (_block, trailing) => ({ id: uid("heading"), type: "heading", text: trailing || "Untitled section" }),
      },
      {
        id: "todo",
        label: "Todo",
        hint: "Track a task inline",
        aliases: ["task", "check"],
        apply: (_block, trailing) => ({ id: uid("todo"), type: "todo", text: trailing || "Untitled task", done: false }),
      },
      {
        id: "skill",
        label: "Skill",
        hint: "Call a project skill",
        aliases: ["call", "invoke"],
        apply: (_block, trailing) => {
          const matched = findSkill(trailing, skills) || skills[0];
          return {
            id: uid("skill"),
            type: "skill",
            text: trailing || `Run ${matched.command}`,
            skill: { ...matched, state: "ready" },
          };
        },
      },
      ...skills.map<SlashCommand>((skill) => ({
        id: skill.name,
        label: skill.command,
        hint: `${skill.provider} - ${skill.description}`,
        aliases: [skill.name],
        apply: (_block, trailing) => ({
          id: uid("skill"),
          type: "skill",
          text: trailing || `Run ${skill.command}`,
          skill: { ...skill, state: "ready" },
        }),
      })),
      {
        id: "routine",
        label: "Routine",
        hint: "Create a recurring task",
        aliases: ["recurring", "recurring-task"],
        apply: (_block, trailing) => ({
          id: uid("routine"),
          type: "routine",
          text: trailing || "New recurring task",
          routine: {
            title: trailing || "New recurring task",
            frequency: "Daily",
            nextRun: "Tomorrow 9:00 AM",
            owner: "Atlas",
          },
        }),
      },
      {
        id: "create-skill",
        label: "Create Skill",
        hint: "Write skills/<name>/SKILL.md",
        aliases: ["new-skill", "skill-md"],
        apply: (_block, trailing) => ({
          id: uid("skill-create"),
          type: "skillCreator",
          text: trailing || "New project skill",
          draft: {
            name: trailing || "New project skill",
            description: "Describe when agents should use this skill.",
            body: "1. State the trigger.\n2. Gather the required context.\n3. Produce the expected output.",
            status: "draft",
          },
        }),
      },
      {
        id: "decision",
        label: "Decision",
        hint: "Record a decision with context",
        aliases: ["decide"],
        apply: (_block, trailing) => ({ id: uid("decision"), type: "decision", text: trailing || "Decision: " }),
      },
      {
        id: "memory",
        label: "Memory",
        hint: "Pin durable project context",
        aliases: ["remember", "pin"],
        apply: (_block, trailing) => ({ id: uid("memory"), type: "memory", text: trailing || "Memory: " }),
      },
      {
        id: "agent",
        label: "Agent Note",
        hint: "Live agent status line",
        aliases: ["agent-note"],
        apply: (_block, trailing) => ({ id: uid("agent"), type: "agent", text: trailing || "Iris is waiting for instructions." }),
      },
      {
        id: "divider",
        label: "Divider",
        hint: "Thin section break",
        aliases: ["hr"],
        apply: () => ({ id: uid("divider"), type: "divider", text: "" }),
      },
    ],
    [skills],
  );

  const visibleCommands = useMemo(() => {
    const q = slashQuery.toLowerCase();
    return slashCommands
      .filter((command) => {
        if (!q) return true;
        return (
          command.id.includes(q) ||
          command.label.toLowerCase().includes(q) ||
          command.aliases.some((alias) => alias.includes(q))
        );
      })
      .slice(0, 10);
  }, [slashCommands, slashQuery]);

  const firstBlocks = blocks.slice(0, 2);
  const bodyBlocks = blocks.slice(2);

  const updateBlock = useCallback((id: string, patch: Partial<DocBlock>) => {
    setBlocks((items) => items.map((block) => (block.id === id ? { ...block, ...patch } : block)));
  }, []);

  const replaceBlock = useCallback((id: string, next: DocBlock) => {
    setBlocks((items) => items.map((block) => (block.id === id ? next : block)));
    pendingFocusId.current = next.type === "divider" ? null : next.id;
    setSlashBlockId(null);
    setSlashQuery("");
  }, []);

  const insertBlockAfter = useCallback((id: string, block: DocBlock) => {
    setBlocks((items) => {
      const index = items.findIndex((item) => item.id === id);
      if (index === -1) return [...items, block];
      return [...items.slice(0, index + 1), block, ...items.slice(index + 1)];
    });
    pendingFocusId.current = block.id;
  }, []);

  const removeBlock = useCallback((id: string) => {
    setBlocks((items) => {
      if (items.length <= 1) return items;
      const index = items.findIndex((item) => item.id === id);
      const nextFocus = items[Math.max(0, index - 1)]?.id;
      pendingFocusId.current = nextFocus || null;
      return items.filter((item) => item.id !== id);
    });
  }, []);

  const applyCommand = useCallback(
    (command: SlashCommand) => {
      const targetId = slashBlockId || activeBlockId;
      const current = blocks.find((block) => block.id === targetId);
      if (!targetId || !current) return;
      if (current.type === "title") return;

      const latestText = draftTextRef.current[targetId] ?? current.text;
      const trailing = latestText.replace(/^\/\S*\s?/, "").trim();
      const next = command.apply(current, trailing);
      if (!next) return;

      delete draftTextRef.current[targetId];
      replaceBlock(targetId, next);
      addActivity(`/${command.id} inserted`);
    },
    [activeBlockId, addActivity, blocks, replaceBlock, slashBlockId],
  );

  const insertCommandAfterActive = useCallback(
    (command: SlashCommand) => {
      const anchor = activeBlockId || blocks[blocks.length - 1]?.id;
      const anchorBlock = blocks.find((block) => block.id === anchor) || blocks[0];
      if (!anchor || !anchorBlock) return;

      const next = command.apply(anchorBlock, "");
      if (!next) return;
      insertBlockAfter(anchor, next);
      addActivity(`/${command.id} inserted`);
    },
    [activeBlockId, addActivity, blocks, insertBlockAfter],
  );

  const onTextInput = useCallback(
    (block: DocBlock, text: string) => {
      draftTextRef.current[block.id] = text;
      if (block.type !== "title" && text.startsWith("/")) {
        setSlashBlockId(block.id);
        setSlashQuery(text.slice(1).trim().split(/\s+/)[0] || "");
      } else if (slashBlockId === block.id) {
        setSlashBlockId(null);
        setSlashQuery("");
      }
    },
    [slashBlockId, updateBlock],
  );

  const onTextCommit = useCallback(
    (block: DocBlock, text: string) => {
      delete draftTextRef.current[block.id];
      updateBlock(block.id, { text });
    },
    [updateBlock],
  );

  const onBlockKeyDown = useCallback(
    (event: KeyboardEvent<HTMLElement>, block: DocBlock) => {
      if (event.key === "Enter" && slashBlockId === block.id && visibleCommands[0]) {
        event.preventDefault();
        applyCommand(visibleCommands[0]);
        return;
      }

      if (event.key === "Escape") {
        setSlashBlockId(null);
        setSlashQuery("");
        return;
      }

      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        const liveText = event.currentTarget.textContent || "";
        updateBlock(block.id, { text: liveText });
        insertBlockAfter(block.id, { id: uid("text"), type: "paragraph", text: "" });
        return;
      }

      if (event.key === "Backspace" && !(event.currentTarget.textContent || "") && block.type !== "title") {
        event.preventDefault();
        removeBlock(block.id);
      }
    },
    [applyCommand, insertBlockAfter, removeBlock, slashBlockId, visibleCommands],
  );

  // Active research op for the left-side progress panel.
  const [activeResearch, setActiveResearch] =
    useState<ResearchPanelHandle | null>(null);

  const runSkill = useCallback(
    async (id: string) => {
      const block = blocks.find((item) => item.id === id);
      if (!block?.skill) return;

      // /research has a real backend: POST /api/research → orchestrator
      // streams progress via SSE which the ResearchPanel subscribes to.
      const isResearch =
        block.skill.command === "/research" || block.skill.name === "research";

      updateBlock(id, { skill: { ...block.skill, state: "running" } });
      addActivity(`${block.skill.command} started`);

      if (isResearch) {
        const topic =
          (block.text && block.text.trim()) ||
          `Research request from ${block.skill.command}`;
        try {
          const res = await fetch("/api/research", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ topic, org: DEMO_ORG_SLUG, requestedBy: "doc-author" }),
          });
          const data = (await res.json()) as
            | { research: { id: string; topic: string; orgSlug: string } }
            | { error: string };
          if (!res.ok || !("research" in data)) {
            const msg = "error" in data ? data.error : "Research start failed";
            addActivity(`${block.skill.command} failed: ${msg}`);
            updateBlock(id, { skill: { ...block.skill!, state: "ready" } });
            return;
          }
          setActiveResearch({
            id: data.research.id,
            topic: data.research.topic,
            orgSlug: data.research.orgSlug,
          });
          addActivity(`${block.skill.command} dispatched · ${data.research.id}`);
          // Skill block stays in "running" until the SSE stream closes via
          // the panel — we mark it done when the user closes the panel or
          // when the panel detects completion via a callback.
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Network error";
          addActivity(`${block.skill.command} error: ${msg}`);
          updateBlock(id, { skill: { ...block.skill!, state: "ready" } });
        }
        return;
      }

      window.setTimeout(() => {
        updateBlock(id, { skill: { ...block.skill!, state: "done" } });
        addActivity(`${block.skill!.command} completed`);
      }, 650);
    },
    [addActivity, blocks, updateBlock],
  );

  const createSkill = useCallback(
    async (block: DocBlock) => {
      if (!block.draft) return;
      updateBlock(block.id, { draft: { ...block.draft, status: "saving", message: "Creating SKILL.md..." } });

      try {
        const response = await fetch("/api/skills", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: block.draft.name,
            description: block.draft.description,
            body: block.draft.body,
          }),
        });
        const data = (await response.json()) as {
          skill?: Omit<SkillSummary, "provider">;
          error?: string;
        };

        if (!response.ok || !data.skill) {
          throw new Error(data.error || "Skill creation failed.");
        }

        const created = normalizeCustomSkill(data.skill);
        setCustomSkills((items) => [...items.filter((item) => item.name !== created.name), created]);
        updateBlock(block.id, {
          text: created.label,
          draft: {
            ...block.draft,
            status: "created",
            message: `Created ${created.path}`,
            path: created.path,
          },
        });
        addActivity(`${created.command} became available`);
      } catch (error) {
        updateBlock(block.id, {
          draft: {
            ...block.draft,
            status: "error",
            message: error instanceof Error ? error.message : "Skill creation failed.",
          },
        });
      }
    },
    [addActivity, updateBlock],
  );

  const liveStats = useMemo(
    () => ({
      blocks: blocks.length,
      routines: blocks.filter((block) => block.type === "routine").length,
      skills: skills.length,
      activeSkills: blocks.filter((block) => block.skill?.state === "running").length,
    }),
    [blocks, skills],
  );

  const addFile = useCallback(
    (parentId: string | null) => {
      const next = makeFileNode(nextFileName(fileTree));
      setFileTree((tree) => addFileNode(tree, parentId, next));
      setActiveDocId(next.id);
      setEditingFileId(next.id);
      addActivity(`${next.name} added`);
    },
    [addActivity, fileTree],
  );

  const renameFile = useCallback(
    (id: string, name: string) => {
      const cleanName = name.replace(/\s+/g, " ").trim() || "Untitled";
      setFileTree((tree) => mapFileTree(tree, id, (node) => ({ ...node, name: cleanName })));
      setEditingFileId(null);
      addActivity(`${cleanName} renamed`);
    },
    [addActivity],
  );

  const toggleFile = useCallback((id: string) => {
    setFileTree((tree) => mapFileTree(tree, id, (node) => ({ ...node, expanded: !node.expanded })));
  }, []);

  const deleteFile = useCallback(
    (id: string) => {
      setFileTree((tree) => {
        const next = removeFileNode(tree, id);
        if (activeDocId === id) {
          setActiveDocId(firstFileId(next));
        }
        return next.length > 0 ? next : initialTree;
      });
      if (editingFileId === id) setEditingFileId(null);
      addActivity("File deleted");
    },
    [activeDocId, addActivity, editingFileId, initialTree],
  );

  return (
    <div className="app" data-density="regular" data-rail="1">
      {activeResearch && (
        <ResearchPanel
          research={activeResearch}
          onClose={() => {
            // Mark any /research skill blocks as done when closing the panel.
            setBlocks((items) =>
              items.map((b) =>
                b.skill && b.skill.state === "running" && (b.skill.command === "/research" || b.skill.name === "research")
                  ? { ...b, skill: { ...b.skill, state: "done" } }
                  : b,
              ),
            );
            addActivity(`research panel closed`);
            setActiveResearch(null);
          }}
        />
      )}
      <WorkstationTopBar
        lastSavedAt={lastSavedAt}
        agents={docAgents}
        registeredAgentCount={registeredAgentCount}
        workspaceName={workspaceName}
        projectName={projectName}
        docName={docName}
        onOpenAgent={(id) => {
          setFocusedAgent(id);
          setRailTab("agent");
        }}
      />
      <WorkstationSidebar
        activeId={activeDocId}
        fileTree={fileTree}
        editingFileId={editingFileId}
        onPick={setActiveDocId}
        onAddFile={addFile}
        onRenameFile={renameFile}
        onDeleteFile={deleteFile}
        onToggleFile={toggleFile}
        onBeginRename={setEditingFileId}
        onFinishRename={() => setEditingFileId(null)}
        agents={docAgents}
        registeredAgentCount={registeredAgentCount}
        workspaceName={workspaceName}
        fileTreeTitle={fileTreeTitle}
        onOpenAgent={(id) => {
          setFocusedAgent(id);
          setRailTab("agent");
        }}
      />

      <div className="doc">
        <div className="doc-body living-doc-body">
          <ContextStripUi />

          <div className="doc-meta">
            <span className="pill">
              <span className="dot" /> Live - {workingAgentCount} {agentNoun(workingAgentCount)} working
            </span>
            <span>Updated {lastSavedAt}</span>
            <span>-</span>
            <span>
              Created by <strong style={{ color: "var(--ink-soft)" }}>{createdBy}</strong> - {createdLabel}
            </span>
          </div>

          <div className="block-stack workstation-block-stack">
            {firstBlocks.map((block) => (
              <DocBlockRow
                key={block.id}
                block={block}
                skills={skills}
                editorRefs={editorRefs}
                active={activeBlockId === block.id}
                slashOpen={slashBlockId === block.id}
                commands={visibleCommands}
                onFocus={() => setActiveBlockId(block.id)}
                onTextInput={onTextInput}
                onTextCommit={onTextCommit}
                onKeyDown={onBlockKeyDown}
                onToggleDone={() => updateBlock(block.id, { done: !block.done })}
                onAdd={() => insertBlockAfter(block.id, { id: uid("text"), type: "paragraph", text: "" })}
                onCommand={applyCommand}
                onRoutineChange={(routine) => updateBlock(block.id, { routine, text: routine.title })}
                onSkillPick={(skill) =>
                  updateBlock(block.id, {
                    skill: { ...skill, state: "ready" },
                    text: `Run ${skill.command}`,
                  })
                }
                onRunSkill={() => runSkill(block.id)}
                onDraftChange={(draft) => updateBlock(block.id, { draft, text: draft.name })}
                onCreateSkill={() => createSkill(block)}
              />
            ))}
          </div>

          <StatusStripUi blocks={blocks} liveStats={liveStats} />

          <div className="block-stack workstation-block-stack">
            {bodyBlocks.map((block) => (
              <DocBlockRow
                key={block.id}
                block={block}
                skills={skills}
                editorRefs={editorRefs}
                active={activeBlockId === block.id}
                slashOpen={slashBlockId === block.id}
                commands={visibleCommands}
                onFocus={() => setActiveBlockId(block.id)}
                onTextInput={onTextInput}
                onTextCommit={onTextCommit}
                onKeyDown={onBlockKeyDown}
                onToggleDone={() => updateBlock(block.id, { done: !block.done })}
                onAdd={() => insertBlockAfter(block.id, { id: uid("text"), type: "paragraph", text: "" })}
                onCommand={applyCommand}
                onRoutineChange={(routine) => updateBlock(block.id, { routine, text: routine.title })}
                onSkillPick={(skill) =>
                  updateBlock(block.id, {
                    skill: { ...skill, state: "ready" },
                    text: `Run ${skill.command}`,
                  })
                }
                onRunSkill={() => runSkill(block.id)}
                onDraftChange={(draft) => updateBlock(block.id, { draft, text: draft.name })}
                onCreateSkill={() => createSkill(block)}
              />
            ))}
          </div>

          <div className="continue-banner">
            <span className="ico">
              <Icons.Phone size={14} />
            </span>
            <div className="txt">
              <b>Continue on mobile.</b> Project state, open agents, and context travel with you.
            </div>
            <div className="qr" />
          </div>
        </div>
      </div>

      <WorkstationRightRail
        tab={railTab}
        setTab={setRailTab}
        focusedAgentId={focusedAgent}
        eventCount={EVENTS.length + activity.length}
        localActivity={activity}
      />
      <WorkstationCompose onOpenPalette={() => setPaletteOpen(true)} />
      <CommandPalette
        open={paletteOpen}
        commands={slashCommands}
        onClose={() => setPaletteOpen(false)}
        onCommand={(command) => {
          insertCommandAfterActive(command);
          setPaletteOpen(false);
        }}
      />
    </div>
  );
}

function WorkstationTopBar({
  lastSavedAt,
  agents,
  registeredAgentCount,
  workspaceName,
  projectName,
  docName,
  onOpenAgent,
}: {
  lastSavedAt: string;
  agents: Agent[];
  registeredAgentCount: number;
  workspaceName: string;
  projectName: string;
  docName: string;
  onOpenAgent: (id: string) => void;
}) {
  const peopleHere = PEOPLE.filter((person) => person.online);
  const hiddenAgentCount = Math.max(0, registeredAgentCount - agents.length);

  return (
    <div className="topbar">
      <div className="brand">
        <div className="logo" />
        <span className="name">Throughline</span>
        <span className="sep">/</span>
        <span className="proj">{workspaceName}</span>
      </div>
      <div className="crumbs">
        <span className="crumb">
          <Icons.Doc size={13} /> Projects
        </span>
        <span className="arrow">/</span>
        <span className="crumb">{projectName}</span>
        <span className="arrow">/</span>
        <span className="crumb current">{docName}</span>
      </div>
      <div className="topbar-right">
        <button className="btn" title="Search" type="button">
          <Icons.Search size={14} />
          <span style={{ fontSize: 12 }}>Find</span>
          <span className="kbd">Ctrl F</span>
        </button>
        <div className="presence">
          <div className="avs">
            {peopleHere.map((person) => (
              <span
                key={person.id}
                className="av"
                title={`${person.name} - ${person.role}`}
                style={{ background: person.tone, color: "#fff" }}
              >
                {person.initials}
                {person.online && <span className="dot" />}
              </span>
            ))}
            {agents.map((agent) => {
              const style: AgentColorStyle = { ["--agent-color"]: agent.color };
              return (
                <button
                  key={agent.id}
                  className="av presence-agent"
                  data-agent="1"
                  style={style}
                  title={`${agent.name} - ${agent.role} - ${agent.provider}`}
                  type="button"
                  onClick={() => onOpenAgent(agent.id)}
                >
                  <span className="glyph">{agent.glyph}</span>
                </button>
              );
            })}
          </div>
          {hiddenAgentCount > 0 && <span className="more">+{hiddenAgentCount}</span>}
        </div>
        <button className="btn" title="Saved" type="button">
          <Icons.Sync size={14} />
          <span style={{ fontSize: 12 }}>Saved {lastSavedAt}</span>
        </button>
        <button className="btn primary" type="button">
          <Icons.Share size={13} /> Share
        </button>
        <button className="btn icon" title="More" type="button">
          <Icons.More size={16} />
        </button>
      </div>
    </div>
  );
}

function WorkstationSidebar({
  activeId,
  fileTree,
  editingFileId,
  agents,
  registeredAgentCount,
  workspaceName,
  fileTreeTitle,
  onPick,
  onAddFile,
  onRenameFile,
  onDeleteFile,
  onToggleFile,
  onBeginRename,
  onFinishRename,
  onOpenAgent,
}: {
  activeId: string;
  fileTree: FileTreeNode[];
  editingFileId: string | null;
  agents: Agent[];
  registeredAgentCount: number;
  workspaceName: string;
  fileTreeTitle: string;
  onPick: (id: string) => void;
  onAddFile: (parentId: string | null) => void;
  onRenameFile: (id: string, name: string) => void;
  onDeleteFile: (id: string) => void;
  onToggleFile: (id: string) => void;
  onBeginRename: (id: string) => void;
  onFinishRename: () => void;
  onOpenAgent: (id: string) => void;
}) {
  const rootId = fileTree[0]?.id || null;

  return (
    <div className="side">
      <div className="side-sec">Workspace</div>
      <div className="side-row">
        <Icons.Globe className="ico" size={14} />
        <span>{workspaceName}</span>
        <span className="meta">23</span>
      </div>
      <div className="side-row">
        <Icons.Memory className="ico" size={14} />
        <span>Shared memory</span>
      </div>
      <div className="side-row">
        <Icons.Agents className="ico" size={14} />
        <span>Agent roster</span>
        <span className="meta">{registeredAgentCount}</span>
      </div>

      <div className="side-sec file-tree-sec">
        <span>{fileTreeTitle}</span>
        <button
          className="tree-head-action"
          type="button"
          title="Add file"
          aria-label="Add file"
          onClick={() => onAddFile(rootId)}
        >
          <Icons.Plus size={12} />
        </button>
      </div>
      <div className="file-tree" aria-label="Project files">
        {fileTree.map((node) => (
          <FileTreeRow
            key={node.id}
            node={node}
            depth={0}
            activeId={activeId}
            editingFileId={editingFileId}
            rootLocked={node.id === rootId}
            onPick={onPick}
            onAddFile={onAddFile}
            onRenameFile={onRenameFile}
            onDeleteFile={onDeleteFile}
            onToggleFile={onToggleFile}
            onBeginRename={onBeginRename}
            onFinishRename={onFinishRename}
          />
        ))}
      </div>

      <div className="side-sec">Agents on this doc</div>
      {agents.map((agent) => {
        const style: AgentColorStyle = { ["--agent-color"]: agent.color };
        return (
          <button
            key={agent.id}
            className="side-agent"
            type="button"
            style={style}
            onClick={() => onOpenAgent(agent.id)}
          >
            <span className="av">{agent.glyph}</span>
            <span className="nm">{agent.name}</span>
            <span className={`stat ${agent.state === "working" ? "live" : ""}`}>
              {agent.state === "working" ? agent.statusShort : agent.lastSeen}
            </span>
          </button>
        );
      })}

      <div className="workspace-foot">
        <b>Throughline Cloud</b>
        <br />
        Powered by GStack, GBrain, ZeroEntropy, The Hog, Lightsprint
      </div>
    </div>
  );
}

function FileTreeRow({
  node,
  depth,
  activeId,
  editingFileId,
  rootLocked,
  onPick,
  onAddFile,
  onRenameFile,
  onDeleteFile,
  onToggleFile,
  onBeginRename,
  onFinishRename,
}: {
  node: FileTreeNode;
  depth: number;
  activeId: string;
  editingFileId: string | null;
  rootLocked: boolean;
  onPick: (id: string) => void;
  onAddFile: (parentId: string | null) => void;
  onRenameFile: (id: string, name: string) => void;
  onDeleteFile: (id: string) => void;
  onToggleFile: (id: string) => void;
  onBeginRename: (id: string) => void;
  onFinishRename: () => void;
}) {
  const hasChildren = !!node.children?.length;
  const FileIcon = iconForFileName(node.name);
  const isEditing = editingFileId === node.id;
  const rowStyle: CSSProperties = { paddingLeft: 10 + depth * 18 };

  return (
    <>
      <div
        className={`side-row file-row ${activeId === node.id ? "active" : ""}`}
        data-depth={depth}
        data-expanded={node.expanded ? "1" : "0"}
        data-editing={isEditing ? "1" : "0"}
        style={rowStyle}
      >
        <button
          className="file-toggle"
          type="button"
          aria-label={hasChildren ? `${node.expanded ? "Collapse" : "Expand"} ${node.name}` : undefined}
          disabled={!hasChildren}
          onClick={(event) => {
            event.stopPropagation();
            if (hasChildren) onToggleFile(node.id);
          }}
        >
          {hasChildren && <Icons.ChevD className="chev" size={13} />}
        </button>
        <div className="file-main">
          <FileIcon className="ico" size={14} />
          {isEditing ? (
            <input
              className="file-name-input"
              defaultValue={node.name}
              autoFocus
              onClick={(event) => event.stopPropagation()}
              onFocus={(event) => event.currentTarget.select()}
              onBlur={(event) => onRenameFile(node.id, event.currentTarget.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  onRenameFile(node.id, event.currentTarget.value);
                }

                if (event.key === "Escape") {
                  event.preventDefault();
                  onFinishRename();
                }
              }}
            />
          ) : (
            <button
              className="file-name-button"
              type="button"
              title="Double-click to rename"
              onClick={() => onPick(node.id)}
              onDoubleClick={() => onBeginRename(node.id)}
              onKeyDown={(event) => {
                if (event.key === "F2") {
                  event.preventDefault();
                  onBeginRename(node.id);
                }
              }}
            >
              <span className="file-name">{node.name}</span>
            </button>
          )}
          {node.count != null && <span className="meta">{node.count}</span>}
        </div>
        <div className="file-actions" aria-label={`${node.name} file actions`}>
          <button
            className="file-action"
            type="button"
            title="Add nested file"
            aria-label={`Add nested file under ${node.name}`}
            onClick={(event) => {
              event.stopPropagation();
              onAddFile(node.id);
            }}
          >
            <Icons.Plus size={11} />
          </button>
          {!rootLocked && (
            <button
              className="file-action danger"
              type="button"
              title="Delete file"
              aria-label={`Delete ${node.name}`}
              onClick={(event) => {
                event.stopPropagation();
                onDeleteFile(node.id);
              }}
            >
              x
            </button>
          )}
        </div>
      </div>
      {hasChildren &&
        node.expanded &&
        node.children!.map((child) => (
          <FileTreeRow
            key={child.id}
            node={child}
            depth={depth + 1}
            activeId={activeId}
            editingFileId={editingFileId}
            rootLocked={false}
            onPick={onPick}
            onAddFile={onAddFile}
            onRenameFile={onRenameFile}
            onDeleteFile={onDeleteFile}
            onToggleFile={onToggleFile}
            onBeginRename={onBeginRename}
            onFinishRename={onFinishRename}
          />
        ))}
    </>
  );
}

function iconForFileName(name: string) {
  const normalized = name.toLowerCase();
  if (normalized.includes("decision")) return Icons.Decision;
  if (normalized.includes("deploy") || normalized.includes("release") || normalized.includes("branch") || normalized.includes("pr")) {
    return Icons.Branch;
  }
  if (normalized.includes("launch") || normalized.includes("plan") || normalized.includes("todo") || normalized.includes("task")) {
    return Icons.Plan;
  }
  if (normalized.includes("memory") || normalized.includes("remember")) return Icons.Memory;
  if (normalized.includes("agent") || normalized.includes("roster")) return Icons.Agents;
  if (normalized.includes("routine") || normalized.includes("schedule") || normalized.includes("sync")) return Icons.Sync;
  return Icons.Doc;
}

function ContextStripUi() {
  return (
    <div className="ctx-strip doc-static-context">
      <div className="pct">
        <span>Context</span>
        <div className="bar warn">
          <i style={{ width: "84%" }} />
        </div>
        <span className="mono">84%</span>
      </div>
      <div className="meta-bits">
        <span>
          <b>142</b> turns
        </span>
        <span>
          <b>84.2K</b> tok
        </span>
        <span>
          <b>3x</b> compressed
        </span>
      </div>
      <button className="compress-btn" disabled type="button" title="Memory wiring is intentionally deferred">
        <Icons.Compress className="ico" size={12} />
        Context wiring later
      </button>
    </div>
  );
}

function StatusStripUi({
  blocks,
  liveStats,
}: {
  blocks: DocBlock[];
  liveStats: { blocks: number; routines: number; skills: number; activeSkills: number };
}) {
  const todos = blocks.filter((block) => block.type === "todo");
  const doneTodos = todos.filter((block) => block.done).length;

  return (
    <div className="status-strip">
      <div className="status-cell">
        <div className="lbl">Plan</div>
        <div className="val">
          {doneTodos} / {todos.length || 0} <span className="sub">done</span>
        </div>
      </div>
      <div className="status-cell">
        <div className="lbl">Blocks</div>
        <div className="val">
          {liveStats.blocks} <span className="sub">editable</span>
        </div>
      </div>
      <div className="status-cell">
        <div className="lbl">Skills</div>
        <div className="val">
          <span className="live-dot" /> {liveStats.skills} <span className="sub">available</span>
        </div>
      </div>
      <div className="status-cell">
        <div className="lbl">Routines</div>
        <div className="val">
          {liveStats.routines} <span className="sub">scheduled</span>
        </div>
      </div>
    </div>
  );
}

function WorkstationRightRail({
  tab,
  setTab,
  focusedAgentId,
  eventCount,
  localActivity,
}: {
  tab: RailTab;
  setTab: (tab: RailTab) => void;
  focusedAgentId: string;
  eventCount: number;
  localActivity: string[];
}) {
  const focused =
    AGENTS.find((agent) => agent.id === focusedAgentId) || getTopActiveAgents(AGENTS)[0] || AGENTS[0];

  return (
    <div className="rail">
      <div className="rail-tabs">
        <button className={`rail-tab ${tab === "activity" ? "active" : ""}`} type="button" onClick={() => setTab("activity")}>
          Activity <span className="count">{eventCount}</span>
        </button>
        <button className={`rail-tab ${tab === "agent" ? "active" : ""}`} type="button" onClick={() => setTab("agent")}>
          Agent
        </button>
        <button className={`rail-tab ${tab === "memory" ? "active" : ""}`} type="button" onClick={() => setTab("memory")}>
          Memory
        </button>
        <button className={`rail-tab ${tab === "context" ? "active" : ""}`} type="button" onClick={() => setTab("context")}>
          Context
        </button>
      </div>
      <div className="rail-body">
        {tab === "activity" && <ActivityPanel localActivity={localActivity} />}
        {tab === "agent" && <AgentPanel agent={focused} />}
        {tab === "memory" && <MemoryPanelStatic />}
        {tab === "context" && <ContextPanelStatic />}
      </div>
    </div>
  );
}

function ActivityPanel({ localActivity }: { localActivity: string[] }) {
  return (
    <>
      <div className="rail-h">Doc activity</div>
      {localActivity.map((item, index) => (
        <div className="evt" key={`${item}-${index}`}>
          <span className="av" data-agent="1" style={{ ["--agent-color"]: "var(--a-atlas)" } as AgentColorStyle}>
            NZ
          </span>
          <div className="body">
            <div className="line">
              <b>Doc</b> {item}
            </div>
            <div className="when">now</div>
          </div>
        </div>
      ))}
      <div className="rail-h">Workspace stream</div>
      {EVENTS.slice(0, 5).map((event, index) => {
        const agent = AGENTS.find((item) => item.id === event.actor);
        const person = PEOPLE.find((item) => item.id === event.actor);
        const actor = agent || person;
        const style: AgentColorStyle = agent
          ? { ["--agent-color"]: agent.color }
          : { background: person?.tone || "var(--bg-sunken)", color: "#fff" };

        return (
          <div className="evt" key={`${event.actor}-${event.verb}-${index}`}>
            <span className="av" data-agent={agent ? "1" : "0"} style={style}>
              {agent?.glyph || person?.initials || "NZ"}
            </span>
            <div className="body">
              <div className="line">
                <b>{actor?.name || event.actor}</b> {event.verb} {event.target && <code>{event.target}</code>}
              </div>
              <div className="when">{event.when}</div>
              {event.preview && <div className="preview">{event.preview}</div>}
            </div>
          </div>
        );
      })}
    </>
  );
}

function AgentPanel({ agent }: { agent: Agent }) {
  const style: AgentColorStyle = { ["--agent-color"]: agent.color };

  return (
    <>
      <div className="agent-card" style={style}>
        <div className="top">
          <span className="av">{agent.glyph}</span>
          <div>
            <div className="name">{agent.name}</div>
            <div className="role">
              {agent.role} - {agent.provider}
            </div>
          </div>
          <span className="status">
            <span className="dot" />
            {agent.state}
          </span>
        </div>
        <div className="grid">
          <div className="cell">
            <div className="l">Model</div>
            <div className="v">{agent.model}</div>
          </div>
          <div className="cell">
            <div className="l">Cost today</div>
            <div className="v">${agent.costDay}</div>
          </div>
        </div>
        <div className="now">
          <div className="l">Now</div>
          <div className="task">{agent.currentTask || "Idle and available for inline skill work."}</div>
          {agent.state === "working" && (
            <div className="bar">
              <i />
            </div>
          )}
        </div>
      </div>

      <div className="rail-h">Skills</div>
      <div className="rail-chips">
        {agent.skills.map((skill) => (
          <span className="rail-chip" key={skill}>
            /{skill}
          </span>
        ))}
      </div>

      <div className="rail-h">Memory permissions</div>
      <div className="rail-copy">
        Read: <span>{agent.memory.read}</span>
        <br />
        Write: <span>{agent.memory.write}</span>
      </div>
    </>
  );
}

function MemoryPanelStatic() {
  return (
    <>
      <div className="rail-h">Pinned to project</div>
      <div className="rail-note">Static preview. Memory persistence will be wired after the next product decision.</div>
      {MEMORY.map((memory, index) => (
        <div key={index} className="memory" style={{ marginBottom: 10 }}>
          <div className="m-q">{memory.text}</div>
          <div className="m-meta">
            <span>{memory.source}</span>
            <span>-</span>
            <span>{memory.when}</span>
          </div>
        </div>
      ))}
    </>
  );
}

function ContextPanelStatic() {
  return (
    <>
      <div className="rail-h">This session</div>
      <div className="context-grid">
        <RailKV label="Turns" value="142" />
        <RailKV label="Tokens" value="84.2K" />
        <RailKV label="Compressed" value="3x" />
        <RailKV label="Retrieved" value="12 docs" />
      </div>
      <div className="rail-h">Deferred wiring</div>
      <div className="rail-copy">
        Context and memory internals are intentionally shown as interface affordances only for now. The editor already
        supports `/remember`, `/recall`, and `/compress` blocks for the future runtime.
      </div>
    </>
  );
}

function RailKV({ label, value }: { label: string; value: string }) {
  return (
    <div className="rail-kv">
      <div>{label}</div>
      <b>{value}</b>
    </div>
  );
}

function WorkstationCompose({ onOpenPalette }: { onOpenPalette: () => void }) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="compose" onClick={() => inputRef.current?.focus()}>
      <Icons.Plus size={14} style={{ color: "var(--muted)", flexShrink: 0 }} />
      <span className="at" title="Assign to">
        <Icons.At size={11} /> Atlas
      </span>
      <input
        ref={inputRef}
        value={value}
        placeholder="Ask, plan, or invoke a skill - press / for skills, @ to mention"
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "/" && value === "") {
            event.preventDefault();
            onOpenPalette();
          }
        }}
      />
      <span className="kbdh">
        <span className="k">/</span>
      </span>
      <button className="send" aria-label="Send" type="button">
        <Icons.Send size={13} />
      </button>
    </div>
  );
}

function CommandPalette({
  open,
  commands,
  onClose,
  onCommand,
}: {
  open: boolean;
  commands: SlashCommand[];
  onClose: () => void;
  onCommand: (command: SlashCommand) => void;
}) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setSelected(0);
    const timer = window.setTimeout(() => inputRef.current?.focus(), 30);
    return () => window.clearTimeout(timer);
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    if (!q) return commands;
    return commands.filter(
      (command) =>
        command.id.toLowerCase().includes(q) ||
        command.label.toLowerCase().includes(q) ||
        command.hint.toLowerCase().includes(q) ||
        command.aliases.some((alias) => alias.toLowerCase().includes(q)),
    );
  }, [commands, query]);

  useEffect(() => {
    if (selected > filtered.length - 1) {
      setSelected(Math.max(0, filtered.length - 1));
    }
  }, [filtered.length, selected]);

  if (!open) {
    return (
      <>
        <div className="palette-bg" />
        <div className="palette" />
      </>
    );
  }

  return (
    <>
      <div className="palette-bg show" onClick={onClose} />
      <div className="palette show" role="dialog" aria-label="Skill command palette">
        <div className="pal-input">
          <span className="slash">/</span>
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setSelected(0);
            }}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                onClose();
              } else if (event.key === "ArrowDown") {
                event.preventDefault();
                setSelected((index) => Math.min(filtered.length - 1, index + 1));
              } else if (event.key === "ArrowUp") {
                event.preventDefault();
                setSelected((index) => Math.max(0, index - 1));
              } else if (event.key === "Enter" && filtered[selected]) {
                event.preventDefault();
                onCommand(filtered[selected]);
              }
            }}
            placeholder="Invoke a skill, routine, block, or create a new skill..."
          />
          <span className="kbd mono" style={{ fontSize: 10.5, color: "var(--muted)" }}>
            esc
          </span>
        </div>
        <div className="pal-list">
          <div className="pal-h">Doc commands</div>
          {filtered.map((command, index) => (
            <button
              key={command.id}
              className={`pal-item ${index === selected ? "sel" : ""}`}
              type="button"
              onMouseEnter={() => setSelected(index)}
              onClick={() => onCommand(command)}
            >
              <span className="pal-name">/{command.id}</span>
              <span className="pal-desc">{command.hint}</span>
              <span className="pal-by">{command.label}</span>
            </button>
          ))}
          {filtered.length === 0 && <div className="pal-empty">No commands match. Try create-skill.</div>}
        </div>
        <div className="pal-foot">
          <span>
            <span className="k">up/down</span> navigate
          </span>
          <span>
            <span className="k">enter</span> insert
          </span>
          <span>
            <span className="k">/create-skill</span> new skill
          </span>
          <span style={{ marginLeft: "auto" }} className="mono">
            {commands.length} commands
          </span>
        </div>
      </div>
    </>
  );
}

function TopStrip({ lastSavedAt }: { lastSavedAt: string }) {
  return (
    <div className="top">
      <span className="logo" />
      <span className="crumb">Throughline</span>
      <span className="sep">/</span>
      <span className="crumb current">Doc Minimal</span>
      <span className="save">
        <span className="dot" />
        saved {lastSavedAt}
      </span>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="stat-cell">
      <span>{label}</span>
      <b>{value}</b>
    </div>
  );
}

function DocBlockRow({
  block,
  skills,
  editorRefs,
  active,
  slashOpen,
  commands,
  onFocus,
  onTextInput,
  onTextCommit,
  onKeyDown,
  onToggleDone,
  onAdd,
  onCommand,
  onRoutineChange,
  onSkillPick,
  onRunSkill,
  onDraftChange,
  onCreateSkill,
}: {
  block: DocBlock;
  skills: SkillSummary[];
  editorRefs: MutableRefObject<Record<string, HTMLElement | null>>;
  active: boolean;
  slashOpen: boolean;
  commands: SlashCommand[];
  onFocus: () => void;
  onTextInput: (block: DocBlock, text: string) => void;
  onTextCommit: (block: DocBlock, text: string) => void;
  onKeyDown: (event: KeyboardEvent<HTMLElement>, block: DocBlock) => void;
  onToggleDone: () => void;
  onAdd: () => void;
  onCommand: (command: SlashCommand) => void;
  onRoutineChange: (routine: RoutineState) => void;
  onSkillPick: (skill: SkillSummary) => void;
  onRunSkill: () => void;
  onDraftChange: (draft: SkillDraft) => void;
  onCreateSkill: () => void;
}) {
  if (block.type === "divider") {
    return (
      <div className="doc-block divider-block">
        <button className="block-add" type="button" onClick={onAdd} aria-label="Add block">
          +
        </button>
        <hr />
      </div>
    );
  }

  return (
    <div className={`doc-block ${active ? "active" : ""}`} data-kind={block.type}>
      <button className="block-add" type="button" onClick={onAdd} aria-label="Add block">
        +
      </button>
      <span className="block-grip" aria-hidden="true">
        ::
      </span>

      {block.type === "todo" && (
        <button className="check" type="button" data-done={block.done ? "1" : "0"} onClick={onToggleDone} aria-label="Toggle task" />
      )}

      {block.type === "heading" && <span className="heading-num" aria-hidden="true" />}

      <EditableLine
        block={block}
        editorRefs={editorRefs}
        onFocus={onFocus}
        onTextInput={onTextInput}
        onTextCommit={onTextCommit}
        onKeyDown={onKeyDown}
      />

      {block.type === "routine" && block.routine && (
        <RoutineControls routine={block.routine} onChange={onRoutineChange} />
      )}

      {block.type === "skill" && block.skill && (
        <SkillInvocation block={block} skills={skills} onSkillPick={onSkillPick} onRunSkill={onRunSkill} />
      )}

      {block.type === "skillCreator" && block.draft && (
        <SkillCreator draft={block.draft} onChange={onDraftChange} onCreate={onCreateSkill} />
      )}

      {slashOpen && (
        <SlashMenu commands={commands} onCommand={onCommand} />
      )}
    </div>
  );
}

function EditableLine({
  block,
  editorRefs,
  onFocus,
  onTextInput,
  onTextCommit,
  onKeyDown,
}: {
  block: DocBlock;
  editorRefs: MutableRefObject<Record<string, HTMLElement | null>>;
  onFocus: () => void;
  onTextInput: (block: DocBlock, text: string) => void;
  onTextCommit: (block: DocBlock, text: string) => void;
  onKeyDown: (event: KeyboardEvent<HTMLElement>, block: DocBlock) => void;
}) {
  const Tag = block.type === "title" ? "h1" : block.type === "heading" ? "h2" : "div";

  return (
    <Tag
      ref={(node) => {
        editorRefs.current[block.id] = node;
      }}
      className="editable-line"
      contentEditable
      suppressContentEditableWarning
      data-block-editor
      data-empty={!block.text ? "1" : "0"}
      data-placeholder={block.type === "title" ? "Untitled" : "Type / for skills, routines, tasks..."}
      onFocus={onFocus}
      onInput={(event) => onTextInput(block, event.currentTarget.textContent || "")}
      onBlur={(event) => onTextCommit(block, event.currentTarget.textContent || "")}
      onKeyDown={(event) => onKeyDown(event, block)}
    >
      {block.text}
    </Tag>
  );
}

function SlashMenu({ commands, onCommand }: { commands: SlashCommand[]; onCommand: (command: SlashCommand) => void }) {
  return (
    <div className="slash-menu">
      {commands.map((command) => (
        <button key={command.id} type="button" className="slash-item" onMouseDown={(event) => event.preventDefault()} onClick={() => onCommand(command)}>
          <span className="slash-name">{command.label}</span>
          <span className="slash-hint">{command.hint}</span>
        </button>
      ))}
    </div>
  );
}

function RoutineControls({ routine, onChange }: { routine: RoutineState; onChange: (routine: RoutineState) => void }) {
  return (
    <div className="routine-card">
      <select value={routine.frequency} onChange={(event) => onChange({ ...routine, frequency: event.target.value as Frequency })}>
        <option>Daily</option>
        <option>Weekdays</option>
        <option>Weekly</option>
        <option>Monthly</option>
      </select>
      <input value={routine.nextRun} onChange={(event) => onChange({ ...routine, nextRun: event.target.value })} aria-label="Next run" />
      <input value={routine.owner} onChange={(event) => onChange({ ...routine, owner: event.target.value })} aria-label="Routine owner" />
    </div>
  );
}

function SkillInvocation({
  block,
  skills,
  onSkillPick,
  onRunSkill,
}: {
  block: DocBlock;
  skills: SkillSummary[];
  onSkillPick: (skill: SkillSummary) => void;
  onRunSkill: () => void;
}) {
  const skill = block.skill;
  if (!skill) return null;

  return (
    <div className="skill-card">
      <select value={skill.name} onChange={(event) => {
        const next = skills.find((item) => item.name === event.target.value);
        if (next) onSkillPick(next);
      }}>
        {skills.map((item) => (
          <option value={item.name} key={item.name}>
            {item.command} - {item.provider}
          </option>
        ))}
      </select>
      <span className="skill-state" data-state={skill.state}>{skill.state}</span>
      <button type="button" onClick={onRunSkill}>
        Run
      </button>
    </div>
  );
}

function SkillCreator({
  draft,
  onChange,
  onCreate,
}: {
  draft: SkillDraft;
  onChange: (draft: SkillDraft) => void;
  onCreate: () => void;
}) {
  return (
    <div className="create-skill-card">
      <label>
        Name
        <input value={draft.name} onChange={(event) => onChange({ ...draft, name: event.target.value, status: "draft", message: undefined })} />
      </label>
      <label>
        Description
        <input value={draft.description} onChange={(event) => onChange({ ...draft, description: event.target.value, status: "draft", message: undefined })} />
      </label>
      <label>
        Workflow
        <textarea value={draft.body} onChange={(event) => onChange({ ...draft, body: event.target.value, status: "draft", message: undefined })} />
      </label>
      <div className="create-skill-actions">
        <button type="button" onClick={onCreate} disabled={draft.status === "saving" || draft.status === "created"}>
          {draft.status === "saving" ? "Creating..." : draft.status === "created" ? "Created" : "Create SKILL.md"}
        </button>
        {draft.message && <span data-state={draft.status}>{draft.message}</span>}
      </div>
    </div>
  );
}

function findSkill(query: string, skills: SkillSummary[]) {
  const normalized = query.toLowerCase().replace(/^\//, "").trim();
  if (!normalized) return null;
  return skills.find((skill) => skill.name.includes(normalized) || skill.command.slice(1).includes(normalized)) || null;
}

function placeCaretAtEnd(element: HTMLElement | null) {
  if (!element) return;
  const range = document.createRange();
  range.selectNodeContents(element);
  range.collapse(false);
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
}
