import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const ensureJjScript = join(here, "scripts", "ensure-jj.sh");
const disableMarker = ".pi-jujutsu-status-off";
const agentsJjBlockStart = "<!-- pi-jj-vcs:jjtips:start -->";
const agentsJjBlockEnd = "<!-- pi-jj-vcs:jjtips:end -->";
const agentsJjGuidance = `${agentsJjBlockStart}
## Jujutsu Version Control
- Use JJ for local work: \`jj status\`, \`jj diff\`, \`jj log\`, \`jj describe -m "message"\`, \`jj new\`, \`jj op log\`, and \`jj undo\`.
- Do not use Git staged-index workflows: no \`git add\`, \`git commit\`, \`git diff --cached\`, or \`git pull --rebase\`.
- After completing coherent agent-owned work, run \`jj describe -m "message"\` and \`jj new\` before starting unrelated work.
- If \`jj status\` is dirty before you start, treat it as pre-existing user work unless explicitly told to continue it.
- For off-machine backup, prefer \`/jj-backup [branch]\`; use \`/jj-bookmark <branch> [rev]\` only for intentional bookmark alignment.
${agentsJjBlockEnd}`;

type ChangeCounts = { added: number; modified: number; removed: number };
type RevInfo = {
	changeId: string;
	commitId: string;
	description: string;
	bookmarks: string[];
};

type StatusContext = {
	cwd: string;
	hasUI: boolean;
	ui: {
		setStatus: (key: string, text: string | undefined) => void;
		setWidget: (
			key: string,
			lines: string[] | undefined,
			options?: { placement?: "aboveEditor" | "belowEditor" },
		) => void;
		theme: { fg: (color: "warning", text: string) => string };
	};
};

function run(cmd: string, args: string[], cwd: string): string | null {
	try {
		return execFileSync(cmd, args, {
			cwd,
			encoding: "utf8",
			stdio: ["ignore", "pipe", "ignore"],
			timeout: 5000,
		}).trim();
	} catch {
		return null;
	}
}

function runJj(args: string[], cwd: string): string | null {
	return run("jj", args, cwd);
}

function runGit(args: string[], cwd: string): string | null {
	return run("git", args, cwd);
}

function formatChangeSummary({
	added,
	modified,
	removed,
}: ChangeCounts): string {
	const parts: string[] = [];
	if (added) parts.push(`+${added}`);
	if (modified) parts.push(`~${modified}`);
	if (removed) parts.push(`-${removed}`);
	return parts.length > 0 ? parts.join("") : "clean";
}

function truncate(value: string, max = 44): string {
	return value.length <= max ? value : `${value.slice(0, max - 1)}…`;
}

function parseBookmarkNames(raw: string): string[] {
	return raw
		.split(/[\s,]+/)
		.map((part) => part.trim().replace(/[*:]+$/g, ""))
		.filter(Boolean);
}

function currentGitBranch(cwd: string): string | null {
	return runGit(["branch", "--show-current"], cwd);
}

function hasJjRepo(cwd: string): boolean {
	return runJj(["root"], cwd) !== null;
}

function revInfo(cwd: string, rev: string): RevInfo | null {
	const changeId = runJj(
		["log", "-r", rev, "--no-graph", "-T", "change_id.short()"],
		cwd,
	);
	if (changeId === null) return null;
	const commitId =
		runJj(["log", "-r", rev, "--no-graph", "-T", "commit_id.short()"], cwd) ??
		"?";
	const rawDescription =
		runJj(["log", "-r", rev, "--no-graph", "-T", "description"], cwd) ?? "";
	const description = rawDescription.trim()
		? truncate(rawDescription.trim().split(/\r?\n/)[0])
		: "no desc";
	const bookmarks = parseBookmarkNames(
		runJj(["log", "-r", rev, "--no-graph", "-T", "bookmarks"], cwd) ?? "",
	);
	return { changeId, commitId, description, bookmarks };
}

function countJjChanges(cwd: string): ChangeCounts {
	const status = runJj(["status", "--no-pager"], cwd) ?? "";
	const counts = { added: 0, modified: 0, removed: 0 };
	for (const line of status.split(/\r?\n/)) {
		if (line.startsWith("A ")) counts.added += 1;
		else if (line.startsWith("M ")) counts.modified += 1;
		else if (line.startsWith("R ") || line.startsWith("D "))
			counts.removed += 1;
	}
	return counts;
}

function isDirty(counts: ChangeCounts): boolean {
	return counts.added + counts.modified + counts.removed > 0;
}

function firstBookmark(info: RevInfo | null): string | undefined {
	return info?.bookmarks[0];
}

function backupBranch(
	cwd: string,
	current: RevInfo | null,
	parked: RevInfo | null,
): string | null {
	const gitBranch = currentGitBranch(cwd)?.trim();
	if (gitBranch) return gitBranch;
	return firstBookmark(current) ?? firstBookmark(parked) ?? null;
}

function isValidBranchName(cwd: string, branch: string): boolean {
	return runGit(["check-ref-format", "--branch", branch], cwd) !== null;
}

function attachGitHead(cwd: string, branch: string): boolean {
	return runGit(["symbolic-ref", "HEAD", `refs/heads/${branch}`], cwd) !== null;
}

function buildJjStatus(
	cwd: string,
	sessionStart?: { changeId: string; dirty: boolean },
): { text: string; dirty: boolean; warning: boolean } | undefined {
	const current = revInfo(cwd, "@");
	if (!current) return undefined;
	const parked = revInfo(cwd, "@-");
	const counts = countJjChanges(cwd);
	const dirty = isDirty(counts);
	const statusText = formatChangeSummary(counts);
	const currentBookmark = current.bookmarks.join(",");
	const parkedBookmark = parked?.bookmarks.join(",") ?? "";
	const branch = backupBranch(cwd, current, parked);
	const branchHasBookmark =
		!branch ||
		current.bookmarks.includes(branch) ||
		parked?.bookmarks.includes(branch);
	const bookmarkWarning = !branchHasBookmark;
	const preexistingDirty = Boolean(
		dirty && sessionStart?.dirty && sessionStart.changeId === current.changeId,
	);
	const warningText = bookmarkWarning
		? `bkmrk≠${branch}`
		: preexistingDirty
			? "preexisting dirty"
			: "";

	const parkedText = parked
		? `@- ${parked.changeId} · ${parkedBookmark || "no bkmrk"} · "${parked.description}"`
		: "@- none";
	const currentText =
		dirty || current.description !== "no desc" || currentBookmark
			? `@ ${current.changeId} · ${currentBookmark || "no bkmrk"} · "${current.description}"`
			: `@ ${current.changeId}`;

	return {
		text: `${currentText} · ${statusText} · ${parkedText}${warningText ? ` · ${warningText}` : ""}`,
		dirty,
		warning: bookmarkWarning || preexistingDirty,
	};
}

function statusDisabled(cwd: string): boolean {
	return existsSync(join(cwd, disableMarker));
}

function toggleStatus(cwd: string): string {
	const marker = join(cwd, disableMarker);
	if (existsSync(marker)) {
		unlinkSync(marker);
		return "jj statusline enabled";
	}
	writeFileSync(marker, "disabled\n");
	return "jj statusline disabled";
}

function initJj(cwd: string): string {
	const hasJj = run("jj", ["--version"], cwd) !== null;
	if (!hasJj) return "jj is not installed";
	if (existsSync(join(cwd, ".jj"))) return "jj already initialized";
	const result = run("bash", [ensureJjScript, cwd], cwd);
	return result ?? "jj setup failed";
}

function ensureAgentsGuidance(cwd: string): string {
	const path = join(cwd, "AGENTS.md");
	const existing = existsSync(path)
		? readFileSync(path, "utf8")
		: "# Agent Instructions\n";
	let next: string;
	if (
		existing.includes(agentsJjBlockStart) &&
		existing.includes(agentsJjBlockEnd)
	) {
		next = existing.replace(
			new RegExp(`${agentsJjBlockStart}[\\s\\S]*?${agentsJjBlockEnd}`),
			agentsJjGuidance,
		);
	} else if (existing.includes("## Jujutsu Version Control")) {
		next = existing.replace(
			/## Jujutsu Version Control[\s\S]*?(?=\n## |\n<!-- END AGENT GUIDANCE -->|$)/,
			agentsJjGuidance,
		);
	} else {
		const suffix = existing.endsWith("\n") ? "" : "\n";
		next = `${existing}${suffix}\n${agentsJjGuidance}\n`;
	}
	if (next !== existing) {
		writeFileSync(path, next);
		return "AGENTS.md JJ guidance updated";
	}
	return "AGENTS.md JJ guidance already current";
}

function joinArgs(args: unknown): string {
	if (typeof args === "string") return args.trim();
	if (Array.isArray(args)) return args.map(String).join(" ").trim();
	return "";
}

function summarizeOutput(output: string | null, maxLines = 12): string {
	if (!output) return "";
	return output.split(/\r?\n/).filter(Boolean).slice(0, maxLines).join("\n");
}

function parseBookmarkCommand(
	args: unknown,
): { branch: string; rev: string } | null {
	const parts = joinArgs(args).split(/\s+/).filter(Boolean);
	const branch = parts[0];
	if (!branch) return null;
	return { branch, rev: parts[1] ?? "@-" };
}

async function confirm(
	ctx: {
		ui: { confirm?: (title: string, message: string) => Promise<boolean> };
	},
	title: string,
	message: string,
): Promise<boolean> {
	if (!ctx.ui.confirm) return true;
	return ctx.ui.confirm(title, message);
}

export default function repoStatus(pi: ExtensionAPI) {
	let lastRendered: string | undefined;
	let sessionStart: { changeId: string; dirty: boolean } | undefined;
	let pollCtx: StatusContext | undefined;
	let pollTimer: ReturnType<typeof setInterval> | undefined;

	const refresh = (ctx: StatusContext) => {
		if (!ctx.hasUI) return;
		if (statusDisabled(ctx.cwd)) {
			if (lastRendered !== undefined) {
				lastRendered = undefined;
				ctx.ui.setWidget("jj-status", undefined);
				ctx.ui.setStatus("jj-status", undefined);
			}
			return;
		}
		if (!hasJjRepo(ctx.cwd)) {
			if (lastRendered !== undefined) {
				lastRendered = undefined;
				ctx.ui.setWidget("jj-status", undefined);
				ctx.ui.setStatus("jj-status", undefined);
			}
			return;
		}
		startPolling(ctx);

		const next = buildJjStatus(ctx.cwd, sessionStart);
		const rendered = next
			? next.dirty || next.warning
				? ctx.ui.theme.fg("warning", next.text)
				: `\x1b[38;5;71m${next.text}\x1b[39m`
			: undefined;
		if (rendered === lastRendered) return;
		lastRendered = rendered;
		ctx.ui.setWidget("jj-status", rendered ? [rendered] : undefined, {
			placement: "aboveEditor",
		});
		ctx.ui.setStatus("jj-status", undefined);
	};

	const stopPolling = () => {
		if (pollTimer) {
			clearInterval(pollTimer);
			pollTimer = undefined;
		}
		pollCtx = undefined;
	};

	const startPolling = (ctx: StatusContext) => {
		if (!ctx.hasUI || !hasJjRepo(ctx.cwd)) {
			stopPolling();
			return;
		}
		pollCtx = ctx;
		if (pollTimer) return;
		pollTimer = setInterval(() => {
			if (!pollCtx?.hasUI) return;
			refresh(pollCtx);
		}, 5000);
	};

	pi.registerCommand("jj-init", {
		description: "Install/setup jj for the current repo",
		handler: async (_args, ctx) => {
			const result = initJj(ctx.cwd);
			const guidanceResult =
				result.includes("not installed") || result.includes("failed")
					? ""
					: `\n${ensureAgentsGuidance(ctx.cwd)}`;
			ctx.ui.notify(
				`${result}${guidanceResult}`,
				result.includes("failed") || result.includes("not installed")
					? "warning"
					: "info",
			);
			refresh(ctx);
		},
	});

	pi.registerCommand("jj-agents", {
		description: "Install or refresh the AGENTS.md JJ guidance block",
		handler: async (_args, ctx) => {
			const result = ensureAgentsGuidance(ctx.cwd);
			ctx.ui.notify(result, "info");
			refresh(ctx);
		},
	});

	pi.registerCommand("jj-status", {
		description: "Toggle the JJ statusline on/off",
		handler: async (_args, ctx) => {
			const result = toggleStatus(ctx.cwd);
			ctx.ui.notify(result, "info");
			refresh(ctx);
		},
	});

	pi.registerCommand("jj-new", {
		description: "Create a new JJ change",
		handler: async (args, ctx) => {
			const message = joinArgs(args);
			const result = message
				? runJj(["new", "--message", message], ctx.cwd)
				: runJj(["new", "--no-edit"], ctx.cwd);
			ctx.ui.notify(result ?? "jj new failed", result ? "info" : "warning");
			refresh(ctx);
		},
	});

	pi.registerCommand("jj-describe", {
		description: "Set the current JJ change description",
		handler: async (args, ctx) => {
			const message = joinArgs(args);
			if (!message) {
				ctx.ui.notify("Usage: /jj-describe <message>", "warning");
				return;
			}
			const result = runJj(["describe", "--message", message], ctx.cwd);
			ctx.ui.notify(
				result ?? "jj describe failed",
				result ? "info" : "warning",
			);
			refresh(ctx);
		},
	});

	pi.registerCommand("jj-bookmark", {
		description:
			"Create or move a JJ bookmark: /jj-bookmark <branch> [rev] (default rev: @-)",
		handler: async (args, ctx) => {
			const parsed = parseBookmarkCommand(args);
			if (!parsed) {
				ctx.ui.notify("Usage: /jj-bookmark <branch> [rev]", "warning");
				return;
			}
			const target = revInfo(ctx.cwd, parsed.rev);
			if (!target) {
				ctx.ui.notify(`Cannot resolve ${parsed.rev}`, "warning");
				return;
			}
			const ok = await confirm(
				ctx,
				"Move JJ bookmark?",
				`Set bookmark ${parsed.branch} to ${parsed.rev} ${target.changeId} "${target.description}"?`,
			);
			if (!ok) return;
			const exists = runJj(["bookmark", "list", parsed.branch], ctx.cwd);
			const result =
				exists && exists.includes(`${parsed.branch}:`)
					? runJj(
							["bookmark", "move", parsed.branch, "--to", parsed.rev],
							ctx.cwd,
						)
					: runJj(
							["bookmark", "create", parsed.branch, "-r", parsed.rev],
							ctx.cwd,
						);
			ctx.ui.notify(
				result ?? "jj bookmark failed",
				result ? "info" : "warning",
			);
			refresh(ctx);
		},
	});

	pi.registerCommand("jj-backup", {
		description:
			"Confirm, align bookmark to parked change, attach Git HEAD, and git push current branch/bookmark",
		handler: async (args, ctx) => {
			const explicitBranch = joinArgs(args).split(/\s+/).filter(Boolean)[0];
			const current = revInfo(ctx.cwd, "@");
			const parked = revInfo(ctx.cwd, "@-");
			const counts = countJjChanges(ctx.cwd);
			if (isDirty(counts)) {
				ctx.ui.notify(
					"Working copy is dirty. Run /jj-describe then /jj-new before /jj-backup.",
					"warning",
				);
				return;
			}
			const branch = explicitBranch ?? backupBranch(ctx.cwd, current, parked);
			if (!branch) {
				ctx.ui.notify(
					"No Git branch or JJ bookmark found. Use /jj-bookmark <branch> first, or /jj-backup <branch>.",
					"warning",
				);
				return;
			}
			if (!isValidBranchName(ctx.cwd, branch)) {
				ctx.ui.notify(`Invalid Git branch name: ${branch}`, "warning");
				return;
			}
			const target = parked ?? current;
			if (!target) {
				ctx.ui.notify("No JJ target found for backup", "warning");
				return;
			}
			const ok = await confirm(
				ctx,
				"Backup to GitHub?",
				`Move/create bookmark ${branch} at @- ${target.changeId} "${target.description}", attach Git HEAD to ${branch}, and run git push origin ${branch}?`,
			);
			if (!ok) return;
			const exists = runJj(["bookmark", "list", branch], ctx.cwd);
			const bookmarkResult =
				exists && exists.includes(`${branch}:`)
					? runJj(["bookmark", "move", branch, "--to", "@-"], ctx.cwd)
					: runJj(["bookmark", "create", branch, "-r", "@-"], ctx.cwd);
			if (!bookmarkResult) {
				ctx.ui.notify("jj bookmark update failed", "warning");
				return;
			}
			if (!attachGitHead(ctx.cwd, branch)) {
				ctx.ui.notify(
					`Bookmark updated, but attaching Git HEAD to ${branch} failed. Push skipped.`,
					"warning",
				);
				refresh(ctx);
				return;
			}
			const pushResult = runGit(["push", "origin", branch], ctx.cwd);
			ctx.ui.notify(
				pushResult || `attached HEAD and pushed origin ${branch}`,
				pushResult !== null ? "info" : "warning",
			);
			refresh(ctx);
		},
	});

	pi.registerCommand("jj-diff", {
		description: "Show a JJ diff summary",
		handler: async (_args, ctx) => {
			const result = runJj(["diff", "--git", "--stat"], ctx.cwd);
			ctx.ui.notify(
				summarizeOutput(result) || "jj diff failed",
				result ? "info" : "warning",
			);
		},
	});

	pi.on("session_start", async (_event, ctx) => {
		const current = revInfo(ctx.cwd, "@");
		if (current) {
			sessionStart = {
				changeId: current.changeId,
				dirty: isDirty(countJjChanges(ctx.cwd)),
			};
		}
		refresh(ctx);
		startPolling(ctx);
	});
	pi.on("turn_end", async (_event, ctx) => {
		refresh(ctx);
		startPolling(ctx);
	});
	pi.on("tool_result", async (event, ctx) => {
		if (["edit", "write", "bash"].includes(event.toolName)) {
			refresh(ctx);
			startPolling(ctx);
		}
	});
	pi.on("session_shutdown", async (_event, ctx) => {
		stopPolling();
		if (!ctx.hasUI) return;
		ctx.ui.setWidget("jj-status", undefined);
		ctx.ui.setStatus("jj-status", undefined);
	});
}
