# Getting Started — App Builder Agents

This guide covers everything you need to do **before and during** your first run.

---

## Prerequisites

| Requirement | Version | Check |
|-------------|---------|-------|
| Node.js | 18 or higher | `node -v` |
| npm | 9 or higher | `npm -v` |
| Anthropic API key | — | [console.anthropic.com](https://console.anthropic.com) |

---

## Step 1 — Install dependencies

```bash
cd CreateAppAgents
npm install
```

---

## Step 2 — Create the `.env` file

Create a file named `.env` in the project root (next to `package.json`):

```bash
# Required — your Anthropic API key
ANTHROPIC_API_KEY=sk-ant-api03-...

# Optional — GitHub personal access token (only needed if you want the generated
# code pushed to a GitHub repository automatically at the end of the build)
# Required permissions: repo → Full control of private repositories
# Create one at: https://github.com/settings/tokens/new
GITHUB_TOKEN=ghp_...
```

> **Never commit this file.** `.env` is already in `.gitignore`.

---

## Step 3 — Run

```bash
npm start
```

---

## What the tool asks you — step by step

Once you run `npm start`, the tool conducts an interactive session. Here is every question you will be asked and what to answer.

### 1. Language selection

```
1.  English
2.  עברית
3.  Français
...
▶  Select (1-N) [default: 1]:
```

Press **Enter** to keep English, or type the number of your language.

---

### 2. Project name

```
▶  Project name:
```

Type a short name (e.g. `my-todo-app`). The generated code will be saved to:
```
output/my-todo-app/
```

---

### 3. GitHub repository (optional)

```
▶  GitHub repository (owner/repo):
```

If you added `GITHUB_TOKEN` to `.env`, enter the repository in the format `owner/repo`
(e.g. `acme/my-todo-app`). The repository will be created automatically if it does not exist.

**To skip:** press **Enter** — the code is saved locally only.

---

### 4. Existing build detected (only if you ran this project before)

If a previous build exists for this project name, you will see:

```
1 — Fresh build (start over)
2 — Resume   (continue from where it stopped)
3 — Update   (add a new feature to a finished build)
```

- **Fresh** wipes the previous output and starts again.
- **Resume** picks up from the last completed layer — useful if the build was interrupted.
- **Update** runs only the squads affected by your change request — much faster than a full rebuild.

---

### 5. Input mode

```
1️⃣   AI Planning  — interactive conversation with a product advisor
2️⃣   Direct Input — type your requirements yourself
```

**Mode 1 — AI Planning (recommended for new projects)**

The system starts a conversation and asks you questions about your app:
purpose, audience, platform, screens, features, integrations, languages, etc.
When you are ready to build, type `ready` or `let's build`.

**Mode 2 — Direct Input**

Type your requirements freely (one line at a time). When done, type `END` on its own line.

Example:
```
Simple REST API for a todo list.
Users can create, read, update, and delete todos.
Each todo has a title, description, and done status.
Auth via JWT.
END
```

---

### 6. Quality tier (Extended Thinking)

```
1️⃣  Economy  — no extended thinking, faster and cheaper
2️⃣  Balanced — adaptive extended thinking (Claude decides when to think)   [default]
3️⃣  Maximum  — full extended thinking, highest quality
▶  Select level (1, 2 or 3) [default: 2]:
```

| Tier | Speed | Cost | Best for |
|------|-------|------|----------|
| 1 | Fastest | Lowest | Quick tests, simple APIs |
| 2 | Medium | Medium | Most projects |
| 3 | Slowest | Highest | Complex apps, production quality |

Press **Enter** to use the default (Balanced).

---

### 7. Design phase (optional)

```
▶  Design the app before development? (y/n):
```

If you press **Enter** or `y`, you will be shown a design picker where you can choose
the visual style of the app (color palette, typography, component style, dark mode).
This is recommended for projects with a UI — the design choices are passed to every
agent that writes frontend code.

---

## During the build — approval gates

The build is divided into layers. After each layer completes, you will see a summary
of what was produced and a prompt:

```
▶  Continue to next layer? (y/n):
```

Press **Enter** or `y` to proceed. Type `n` to stop — progress is saved automatically
and you can resume later (option 2 at startup).

**Fix rounds** also require approval:

```
📋  Fix Round 1 / 2
Quality agents have finished. Findings will be routed to the responsible squads
for fixing. Run a fix round?
▶  Continue? (y/n):
```

You can skip a fix round by typing `n` — the build continues to the next layer.

---

## Where is the output?

All generated files are saved to:
```
output/<project-name>/
```

A checkpoint file (`.build-checkpoint.json`) is also saved there so the build
can be resumed if interrupted.

If you connected a GitHub repository, the code is pushed at the end of the build.

---

## After the build — what to do next

Open the generated project and read these files in order:

1. **`docs/setup-guide.md`** — everything you need to do to get the app running:
   environment variables, database setup, Firebase, Stripe, code signing, etc.
   This file is tailored to the specific services your project uses.

2. **`docs/INDEX.md`** — a map of every document produced during the build.

3. **`README.md`** — quick start and project structure.

---

## Common issues

### ❌ `Missing ANTHROPIC_API_KEY`
You forgot to create the `.env` file or the key is missing from it.
Create the file with `ANTHROPIC_API_KEY=sk-ant-...` and run again.

### ❌ `Cannot find module '...'`
Run `npm install` — dependencies are not installed.

### ❌ Build stopped mid-way
Run `npm start` again with the same project name and choose **Resume** (option 2).
The build continues from the last completed layer.

### ❌ GitHub push failed
Check that `GITHUB_TOKEN` is set in `.env` and has `repo` permissions.
The generated code is still saved locally at `output/<project-name>/`.

### ❌ An agent failed
The tool will tell you which agent failed and ask whether to continue or stop.
Non-critical failures (e.g. an optional agent) are skipped automatically.
Critical failures (e.g. `backendDev`) require your decision.

---

## Tips

- **For a quick test** use Tier 1 + Mode 2 with a short description — a build can complete in under 10 minutes.
- **For production quality** use Tier 2 or 3 + Mode 1 (full planning session).
- **To add a feature later** run again with the same project name and choose **Update** (option 3) — only the affected parts of the codebase are regenerated.
- Set `DEBUG=true` in `.env` to see full error stack traces if something goes wrong.
