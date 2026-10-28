/**
 * Remote Aurora MCP client launcher (Streamable HTTP over TLS).
 *
 * ## Why this file exists
 *
 * Cursor (and other MCP hosts) can connect to remote MCP servers in two ways:
 *
 *   1. Direct URL  —  `"url": "https://host/mcp"`  (Cursor speaks HTTP itself)
 *   2. Stdio proxy   —  spawn a child process that bridges stdin/stdout ↔ HTTP
 *
 * For CLT production (`mcp.cltbcanada.net/aurora`), option 1 often fails with
 * "fetch failed" / "unable to get local issuer certificate" even though the site
 * loads fine in Safari/Chrome. Cursor runs on Electron/Node, which only trusts
 * the OS root store plus any extra CAs listed in NODE_EXTRA_CA_CERTS.
 *
 * The IIS certificate is signed by an internal CA (CLTBCANADA-VM1-PNDC3-CA),
 * not a public WebPKI root. This launcher is option 2: it spawns `mcp-remote`
 * (a stdio ↔ Streamable HTTP bridge) with NODE_EXTRA_CA_CERTS pointing at a
 * PEM bundle that includes both the server leaf and the internal CA.
 *
 * ## What this does NOT do
 *
 * - It does NOT start the local Aurora registry server (`launch.mjs` does that).
 * - All MCP tools still come from the deployed remote host; we only fix TLS.
 *
 * ## Typical wiring (`.cursor/mcp.json`)
 *
 *   { "command": "node", "args": ["${workspaceFolder}/tools/aurora-mcp/launch-remote.mjs"] }
 *
 * Equivalent npm script: `npm run mcp:aurora:remote-client`
 *
 * @see docs/setup/aurora-mcp-remote-clients.md
 * @see tools/aurora-mcp/launch.mjs          — local stdio server (no HTTP)
 * @see tools/aurora-mcp/AURORA_MCP_ARCHITECTURE.md
 */
import { defaultBundlePath, ensureCertBundle } from "./cert-bundle.mjs"
import { forwardChildExit, spawnNpx } from "./spawn-utils.mjs"

const DEFAULT_REMOTE_URL = "https://mcp.cltbcanada.net/aurora/mcp"
const REMOTE_URL = process.env.AURORA_MCP_URL ?? DEFAULT_REMOTE_URL

const resolvedCa = await ensureCertBundle({
    remoteUrl: REMOTE_URL,
    bundlePath: defaultBundlePath,
})

const env = {
    ...process.env,
    NODE_EXTRA_CA_CERTS: resolvedCa,
}

const child = spawnNpx(["-y", "mcp-remote@0.8.1", REMOTE_URL], {
    stdio: "inherit",
    env,
})

forwardChildExit(child)
