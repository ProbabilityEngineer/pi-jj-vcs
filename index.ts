import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { execFileSync } from "node:child_process";
import { existsSync, writeFileSync, unlinkSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const ensureJjScript = join(here, "scripts", "ensure-jj.sh");
const disableMarker = ".pi-jujutsu-status-off";

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

function formatChangeSummary(
	added: number,
	modified: number,
	removed: number,
): string {
	const parts: string[] = [];
	if (added) parts.push(`+${added}`);
	if (modified) parts.push(`~${modified}`);
	if (removed) parts.push(`-${removed}`);
	return parts.length > 0 ? parts.join("") : "clean";
}

function hasJjRepo(cwd: string): boolean {
	return runJj(["root"], cwd) !== null;
}

function buildJjStatus(
	cwd: string,
): { text: string; dirty: boolean } | undefined {
	const bookmark =
		runJj(["log", "-r", "@", "--no-graph", "-T", "bookmarks"], cwd) ?? "";
	const rawDescription = runJj(
		["log", "-r", "@", "--no-graph", "-T", "description"],
		cwd,
	);
	const description =
		rawDescription && rawDescription.trim()
			? rawDescription.trim().split(/\r?\n/)[0]
			: "no descrp";
	const status = runJj(["status", "--no-pager"], cwd) ?? "";

	let added = 0;
	let modified = 0;
	let removed = 0;
	for (const line of status.split(/\r?\n/)) {
		if (line.startsWith("A ")) added += 1;
		else if (line.startsWith("M ")) modified += 1;
		else if (line.startsWith("R ")) removed += 1;
	}

	const dirty = added + modified + removed > 0;
	return {
		text: `jj:${dirty ? "dirty" : "clean"} ${bookmark || "no bkmrk"}·${description}·${formatChangeSummary(added, modified, removed)}`,
		dirty,
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

function joinArgs(args: unknown): string {
	if (typeof args === "string") return args.trim();
	if (Array.isArray(args)) return args.map(String).join(" ").trim();
	return "";
}

function summarizeOutput(output: string | null, maxLines = 12): string {
	if (!output) return "";
	return output.split(/\r?\n/).filter(Boolean).slice(0, maxLines).join("\n");
}

export default function repoStatus(pi: ExtensionAPI) {
	let lastRendered: string | undefined;

	const refresh = (ctx: {
		cwd: string;
		hasUI: boolean;
		ui: {
			setStatus: (key: string, text: string | undefined) => void;
			theme: { fg: (color: string, text: string) => string };
		};
	}) => {
		if (!ctx.hasUI) return;
		if (statusDisabled(ctx.cwd)) {
			if (lastRendered !== undefined) {
				lastRendered = undefined;
				ctx.ui.setStatus("jj-status", undefined);
			}
			return;
		}
		if (!hasJjRepo(ctx.cwd)) {
			if (lastRendered !== undefined) {
				lastRendered = undefined;
				ctx.ui.setStatus("jj-status", undefined);
			}
			return;
		}

		const next = buildJjStatus(ctx.cwd);
		const rendered = next
			? next.dirty
				? ctx.ui.theme.fg("warning", next.text)
				: `\x1b[38;5;71m${next.text}\x1b[39m`
			: undefined;
		if (rendered === lastRendered) return;
		lastRendered = rendered;
		ctx.ui.setStatus("jj-status", rendered);
	};

	pi.registerCommand("jj-init", {
		description: "Install/setup jj for the current repo",
		handler: async (_args, ctx) => {
			const result = initJj(ctx.cwd);
			ctx.ui.notify(
				result,
				result.includes("failed") || result.includes("not installed")
					? "warning"
					: "info",
			);
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
				ctx.ui.notify("Usage: /jj describe <message>", "warning");
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

	pi.on("session_start", async (_event, ctx) => refresh(ctx));
	pi.on("turn_end", async (_event, ctx) => refresh(ctx));
	pi.on("tool_result", async (event, ctx) => {
		if (["edit", "write", "bash"].includes(event.toolName)) refresh(ctx);
	});
	pi.on("session_shutdown", async (_event, ctx) => {
		if (!ctx.hasUI) return;
		ctx.ui.setStatus("jj-status", undefined);
	});
}
