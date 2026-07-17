---
name: n8n-workflow-builder
description: Use when creating, modifying, or debugging n8n workflows, or when switching between named n8n instances. Enforces using the latest node versions, AI Agent node for sub-agents (not Chain/pipeline nodes), pre-deploy validation, post-deploy test, autofix, and a release/CVE check against github.com/n8n-io/n8n/releases proposing the minimal stable upgrade that fixes any bug or vulnerability affecting the user. Triggers on any mention of n8n, workflow, automation flow, n8n nodes, "cambia de n8n" (switch n8n), "conéctate al n8n de X" (connect to X's n8n), or when the user asks to build/update an n8n flow.
---

# n8n Workflow Builder (safe, latest-version, agent-correct)

Speak to the user in the `language` set in `~/.claude/braves-skills.json`; if
unset, default to Spanish.

## Overview
Build n8n flows safely and reproducibly. **Never** use outdated node
versions or pipeline (Chain) nodes when it comes to AI subagents. Always
validate before deploying and test afterward.

## Hard Rules (non-negotiable)

### 1. Always the Latest Node Version
- **Before** adding any node to a workflow, call
  `mcp__n8n-mcp__search_nodes` or `mcp__n8n-mcp__get_node` to get the latest
  `typeVersion`.
- If the existing flow uses an old version, **update it** to the current
  `typeVersion` in the same operation.
- Never copy a `typeVersion` from an old example, from memory, or from
  another workflow without verifying it.

### 2. AI Subagents = AI Agent Node (NOT Chain)
- For any subagent, reasoning, tool-use, or LLM with tools: use
  **`@n8n/n8n-nodes-langchain.agent`** (AI Agent).
- **Forbidden** for subagents: `@n8n/n8n-nodes-langchain.chainLlm`,
  `chainSummarization`, `chainRetrievalQa`, or any "Chain" or pipeline node.
- Chain nodes are only valid for deterministic, single-pass pipelines with
  no tools — never for anything the user calls an "agent" or "subagent".
- The AI Agent **always** has at least the following connected:
  - 1× Chat Model (sub-node `ai_languageModel`)
  - 0+× Tools (sub-node `ai_tool`) — for nested subagents, connect another AI
    Agent as a tool via `@n8n/n8n-nodes-langchain.agentTool` or the current
    MCP pattern
  - optional: Memory (`ai_memory`), Output Parser (`ai_outputParser`)

### 3. Validate Before Creating/Updating
- Every new node: `mcp__n8n-mcp__validate_node` with its config.
- Full workflow: `mcp__n8n-mcp__validate_workflow` before
  `n8n_create_workflow` or `n8n_update_full_workflow`.
- If validate returns errors: fix them. Don't deploy with outdated-version
  warnings.

### 4. Test After Deploying
- After creating/updating: `mcp__n8n-mcp__n8n_test_workflow` with a minimal
  realistic payload.
- If it fails: `mcp__n8n-mcp__n8n_autofix_workflow`, re-validate, re-test.
  Max 2 autofix cycles before asking the user for input.

### 5. Partial Updates, Not Full
- For changes to existing flows, prefer `n8n_update_partial_workflow` (diff)
  over `n8n_update_full_workflow` (full replacement). Only use full if the
  change touches more than 60% of the flow.

### 6. n8n Release / Vulnerability Check
At the start of every n8n work session (or when a suspicious core-bug error
appears):

1. Detect the instance's current version:
   - `mcp__n8n-mcp__n8n_health_check` → usually includes `version`. If not,
     ask the user for `docker exec n8n n8n --version` or the image tag.
2. Fetch recent releases:
   - `WebFetch` on `https://github.com/n8n-io/n8n/releases` (HTML page) or
     `https://api.github.com/repos/n8n-io/n8n/releases?per_page=30` (JSON,
     cleaner).
   - If you need detail on a specific release:
     `https://api.github.com/repos/n8n-io/n8n/releases/tags/n8n@<VERSION>`.
3. Compare `installed → latest` and review changelogs/release notes looking
   for:
   - `Security`, `CVE-`, `GHSA-`, `vulnerability`, `RCE`, `XSS`, `SSRF`,
     `auth bypass` tags
   - Bugs affecting nodes used in the current flow (search the release body
     by node name)
   - `Breaking change` notices → plan around them before proposing the
     upgrade
4. Filter by **stability**:
   - Prefer the **latest stable `latest` version** (not `next`, no
     pre-release, no betas)
   - If `latest` introduces a breaking change that breaks the flow, propose
     the **latest patch of the previous minor** that does include the
     security fix
   - If a version is flagged `[deprecated]` or `[do not upgrade]` in the
     release notes, skip it
5. Propose the upgrade using this template (you deploy nothing yourself —
   the upgrade is the user's call):
   ```
   Installed version: <X.Y.Z>
   Recommended version: <A.B.C> (stable latest / fix-only)
   Reason:
     - <CVE/GHSA or bug ID> — <1-line description> — release <tag>
     - <bug affecting node X used in the flow> — release <tag>
   Breaking changes to review before upgrading:
     - <list or "none relevant">
   Suggested command: <docker pull n8nio/n8n:A.B.C  /  pnpm add -g n8n@A.B.C>
   ```
6. If nothing affects the user: say **one single line** "n8n <X.Y.Z> up to
   date, no CVEs or bugs applicable to the flow." Don't pad the report.
7. Don't upgrade the version on your own — you only propose. The instance
   upgrade is not an MCP tool call.

## Named instances & switching (no restart)

Multiple n8n instances live as `~/.claude/n8n-instances/<alias>.json`
files (`{"N8N_API_URL": "...", "N8N_API_KEY": "..."}`). The file
`~/.claude/n8n-instances/active` holds the alias in use; the MCP entry
runs this plugin's `scripts/n8n-launcher.sh`, which reads the active
alias when the server starts.

- **One-time registration** (braves-setup does this):
  `claude mcp add --scope user n8n-mcp -- sh ~/.claude/skills/braves-skills/scripts/n8n-launcher.sh`
- **"switch to n8n <alias>" / "cámbiate al n8n de <alias>"**: check
  `<alias>.json` exists (if not, list available aliases), write the
  alias into `active`, then tell the user: run `/mcp` → `n8n-mcp` →
  Reconnect — takes seconds, no Claude Code restart. Confirm with
  `n8n_health_check` after reconnecting.
- **"add an n8n instance <alias>"**: create `<alias>.json` with the URL
  and `"N8N_API_KEY": "PASTE_YOUR_KEY_HERE"`, open it in the user's
  editor for them to paste the key — never ask for keys in the chat.
- **"which n8n am I on?"**: read `active` and print alias + URL (never
  the key).

## Workflow

```
1. Understand the requirement → ask if the trigger or expected output is missing
2. mcp__n8n-mcp__n8n_health_check  (verify connection + version)
3. Release/CVE check (rule 6) → propose upgrade if applicable
4. For each node in the design:
     a. search_nodes / get_node  → current typeVersion + schema
     b. validate_node  → correct config
5. Compose the workflow JSON with verified typeVersions
6. validate_workflow
7. n8n_create_workflow  (or n8n_update_partial_workflow)
8. n8n_test_workflow with minimal payload
9. If error → n8n_autofix_workflow → back to 6
10. Report to the user: workflow ID, URL, nodes used with versions, and upgrade proposal if any
```

## Correct Subagent Patterns

### Simple Subagent (LLM with tools)
```
[Trigger] → [AI Agent (@n8n/n8n-nodes-langchain.agent)]
                ├── ai_languageModel: OpenAI/Anthropic Chat Model (latest v)
                ├── ai_tool: HTTP Request Tool, Code Tool, etc.
                └── ai_memory: Buffer Window (optional)
```

### Nested Subagent (agent invoking another agent)
```
[Main AI Agent]
    └── ai_tool: [AI Agent Tool] → its own Chat Model + tools
```
**Do NOT** use Chain nodes as tools of the main agent. The sub-agent must be
another AI Agent exposed as a tool.

### Deterministic Pipeline (NOT a subagent)
Chain nodes are only valid here — when it's a linear pipeline with no
decisions:
```
[Trigger] → [Chain LLM] → [Output Parser] → [Next step]
```
If the user says "agent" or "decides" or "uses tools" → this **is not** that
case.

## Mistakes to Avoid (user history)

- ❌ Using `typeVersion: 1` when it's already at 3 or 4
- ❌ `@n8n/n8n-nodes-langchain.chainLlm` for something the user called a
  "subagent"
- ❌ Creating a workflow without validating (ends in connection errors or
  misconfigured credentials)
- ❌ Replacing the full workflow when only 2 nodes changed
- ❌ Assuming credentials — always check with `get_node` what
  `credentialsName` the current version expects

## Final Report to the User

After deploying, reply briefly:
```
Workflow created: <name> (id: <id>)
URL: <url>
Nodes: <list with name + typeVersion>
Test: OK / Error → <detail>
```
No emojis. No step-by-step summary of what you did — the user already saw
the tool calls.
