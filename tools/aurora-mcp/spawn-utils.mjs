/**
 * Cross-platform child-process helpers for Aurora MCP launchers.
 */
import { spawn } from "node:child_process"
import { existsSync } from "node:fs"
import path from "node:path"

const isWin = process.platform === "win32"

/**
 * Spawn `npx` in a way that resolves on Windows (`npx.cmd` via cmd.exe).
 *
 * @param {string[]} args
 * @param {import("node:child_process").SpawnOptions} [options]
 */
export function spawnNpx(args, options = {}) {
    if (isWin) {
        return spawn("cmd.exe", ["/d", "/s", "/c", "npx", ...args], {
            ...options,
            shell: false,
        })
    }

    return spawn("npx", args, { ...options, shell: false })
}

/**
 * Run a repo-local TypeScript entry through the installed `tsx` CLI.
 * Avoids `npx` resolution issues on Windows MCP hosts.
 *
 * @param {string} repoRoot
 * @param {string} scriptRelativePath path relative to repo root
 * @param {import("node:child_process").SpawnOptions} [options]
 */
export function spawnTsx(repoRoot, scriptRelativePath, options = {}) {
    const tsxCli = path.join(repoRoot, "node_modules", "tsx", "dist", "cli.mjs")
    const script = path.join(repoRoot, scriptRelativePath)

    if (!existsSync(tsxCli)) {
        throw new Error(
            `Missing tsx at ${tsxCli}. Run npm install in ${repoRoot} before starting Aurora MCP.`
        )
    }

    return spawn(process.execPath, [tsxCli, script], {
        cwd: repoRoot,
        stdio: "inherit",
        env: process.env,
        ...options,
    })
}

/**
 * Forward child exit status to the launcher process.
 *
 * @param {import("node:child_process").ChildProcess} child
 */
export function forwardChildExit(child) {
    child.on("exit", (code, signal) => {
        if (signal) process.kill(process.pid, signal)
        process.exit(code ?? 1)
    })
    child.on("error", (err) => {
        console.error(err)
        process.exit(1)
    })
}
