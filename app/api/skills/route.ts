import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

type SkillSummary = {
  name: string;
  label: string;
  description: string;
  path: string;
  command: string;
};

const skillsRoot = path.join(process.cwd(), "skills");

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function cleanSingleLine(value: unknown, fallback: string) {
  if (typeof value !== "string") return fallback;
  const cleaned = value.replace(/\s+/g, " ").trim();
  return cleaned || fallback;
}

function skillMarkdown(name: string, description: string, body: string) {
  return `---
name: "${name}"
description: "${description.replace(/"/g, '\\"')}"
---

# ${name}

## Purpose

${description}

## Workflow

${body || "Document the trigger, inputs, steps, and expected output for this skill."}

## Notes

- Created from Throughline Doc Minimal.
- Keep this skill self-contained so every agent can read and reuse it.
`;
}

async function readSkillSummary(dirname: string): Promise<SkillSummary | null> {
  const filePath = path.join(skillsRoot, dirname, "SKILL.md");

  try {
    const content = await readFile(filePath, "utf8");
    const title = content.match(/^#\s+(.+)$/m)?.[1]?.trim() || dirname;
    const description =
      content.match(/^description:\s+"(.+)"$/m)?.[1]?.trim() ||
      content.match(/^## Purpose\s+([\s\S]+?)(?:\n## |\n?$)/m)?.[1]?.trim().split("\n")[0] ||
      "Custom project skill";

    return {
      name: dirname,
      label: title,
      description,
      path: `skills/${dirname}/SKILL.md`,
      command: `/${dirname}`,
    };
  } catch {
    return null;
  }
}

export async function GET() {
  try {
    const entries = await readdir(skillsRoot, { withFileTypes: true });
    const skills = await Promise.all(
      entries.filter((entry) => entry.isDirectory()).map((entry) => readSkillSummary(entry.name)),
    );

    return NextResponse.json({ skills: skills.filter(Boolean) });
  } catch {
    return NextResponse.json({ skills: [] });
  }
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const label = cleanSingleLine(body?.name, "custom-skill");
  const description = cleanSingleLine(body?.description, "Custom project skill");
  const workflow = typeof body?.body === "string" ? body.body.trim() : "";
  const name = slugify(label);

  if (!name) {
    return NextResponse.json({ error: "Skill name must include letters or numbers." }, { status: 400 });
  }

  const skillDir = path.resolve(skillsRoot, name);
  const root = path.resolve(skillsRoot);

  if (!skillDir.startsWith(root + path.sep)) {
    return NextResponse.json({ error: "Invalid skill path." }, { status: 400 });
  }

  try {
    await mkdir(skillsRoot, { recursive: true });
    await mkdir(skillDir, { recursive: false });
    await writeFile(path.join(skillDir, "SKILL.md"), skillMarkdown(label, description, workflow), {
      encoding: "utf8",
      flag: "wx",
    });

    return NextResponse.json({
      skill: {
        name,
        label,
        description,
        path: `skills/${name}/SKILL.md`,
        command: `/${name}`,
      } satisfies SkillSummary,
    });
  } catch (error) {
    const code = typeof error === "object" && error && "code" in error ? error.code : undefined;
    const message =
      code === "EEXIST"
        ? "A skill with that name already exists."
        : "Could not create the skill file.";

    return NextResponse.json({ error: message }, { status: code === "EEXIST" ? 409 : 500 });
  }
}
