/**
 * TLS bundle bootstrap for Aurora MCP remote clients.
 * Builds ~/.config/aurora-mcp/certs/mcp-cltbcanada-net-full-chain.pem when missing.
 */
import { execSync } from "node:child_process"
import { X509Certificate } from "node:crypto"
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { homedir, platform } from "node:os"
import { join } from "node:path"
import tls from "node:tls"

export const INTERNAL_CA_NAME = "CLTBCANADA-VM1-PNDC3-CA"

/** Public CA certificate only. Valid through 2045-05-13. No private key. */
export const BUNDLED_CA_PEM = `-----BEGIN CERTIFICATE-----
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
-----END CERTIFICATE-----`

export const defaultCertDir = join(homedir(), ".config", "aurora-mcp", "certs")
export const defaultBundlePath = join(
    defaultCertDir,
    "mcp-cltbcanada-net-full-chain.pem"
)

/**
 * @param {Buffer | string} raw
 * @returns {string}
 */
export function formatPem(raw) {
    const b64 =
        typeof raw === "string"
            ? raw.replace(/\s+/g, "")
            : raw.toString("base64")
    const lines = b64.match(/.{1,64}/g)?.join("\n") ?? b64
    return `-----BEGIN CERTIFICATE-----\n${lines}\n-----END CERTIFICATE-----\n`
}

/**
 * @param {string} hostname
 * @param {number} [port]
 * @returns {Promise<string>}
 */
export function fetchLeafPem(hostname, port = 443) {
    return new Promise((resolve, reject) => {
        const socket = tls.connect(
            {
                host: hostname,
                port,
                servername: hostname,
                rejectUnauthorized: false,
            },
            () => {
                try {
                    const cert = socket.getPeerCertificate()
                    if (!cert?.raw) {
                        reject(new Error(`No certificate returned from ${hostname}:${port}`))
                        return
                    }
                    resolve(formatPem(cert.raw))
                } catch (err) {
                    reject(err)
                } finally {
                    socket.end()
                }
            }
        )

        socket.setTimeout(15_000, () => {
            socket.destroy(new Error(`TLS timeout connecting to ${hostname}:${port}`))
        })
        socket.on("error", reject)
    })
}

/**
 * @returns {string}
 */
export function fetchCaPemDarwin() {
    return execSync(
        `security find-certificate -a -c "${INTERNAL_CA_NAME}" -p`,
        { encoding: "utf8" }
    ).trim()
}

/**
 * @returns {string}
 */
export function fetchCaPemWindows() {
    const script = [
        "$ErrorActionPreference='Stop'",
        `$name='${INTERNAL_CA_NAME}'`,
        "$found=$null",
        "foreach($store in 'Cert:\\LocalMachine\\Root','Cert:\\CurrentUser\\Root'){",
        "$found=Get-ChildItem -Path $store -ErrorAction SilentlyContinue | Where-Object { $_.Subject -like ('*'+$name+'*') -or $_.Issuer -like ('*'+$name+'*') } | Select-Object -First 1",
        "if($found){break}}",
        "if(-not $found){throw \"CA '$name' not found in Windows certificate store\"}",
        "$bytes=$found.Export([System.Security.Cryptography.X509Certificates.X509ContentType]::Cert)",
        "$b64=[Convert]::ToBase64String($bytes)",
        "Write-Output '-----BEGIN CERTIFICATE-----'",
        "for($i=0;$i -lt $b64.Length;$i+=64){Write-Output $b64.Substring($i,[Math]::Min(64,$b64.Length-$i))}",
        "Write-Output '-----END CERTIFICATE-----'",
    ].join(" ")

    return execSync(`powershell -NoProfile -NonInteractive -Command "${script}"`, {
        encoding: "utf8",
        windowsHide: true,
    }).trim()
}

/**
 * @param {string} pem
 * @param {number} [now]
 * @returns {boolean}
 */
export function pemHasUsableCert(pem, now = Date.now()) {
    const blocks =
        pem.match(
            /-----BEGIN CERTIFICATE-----[\s\S]+?-----END CERTIFICATE-----/g
        ) ?? []
    return blocks.some((block) => {
        try {
            const cert = new X509Certificate(block)
            return Date.parse(cert.validTo) > now
        } catch {
            return false
        }
    })
}

/**
 * Prefer an unexpired keychain CA. Otherwise use the bundled public CA.
 *
 * @param {string} keychainPem
 * @returns {string}
 */
export function resolveCaPem(keychainPem) {
    if (pemHasUsableCert(keychainPem ?? "")) {
        return keychainPem.trim()
    }
    if (pemHasUsableCert(BUNDLED_CA_PEM)) {
        return BUNDLED_CA_PEM.trim()
    }
    return ""
}

/**
 * @returns {string}
 */
function readKeychainCaPem() {
    const os = platform()
    try {
        if (os === "darwin") return fetchCaPemDarwin()
        if (os === "win32") return fetchCaPemWindows()
    } catch {
        return ""
    }
    return ""
}

/**
 * @param {string} remoteUrl
 * @returns {Promise<string>}
 */
async function buildBundle(remoteUrl, bundlePath) {
    const certDir = join(bundlePath, "..")
    mkdirSync(certDir, { recursive: true })

    const host = new URL(remoteUrl).hostname
    const leafPem = (await fetchLeafPem(host)).trim()
    const caPem = resolveCaPem(readKeychainCaPem())
    if (!caPem) {
        throw new Error(
            `Missing TLS CA bundle at ${bundlePath}. ` +
                "Export your internal CA to that path or set AURORA_MCP_CA_CERTS."
        )
    }

    writeFileSync(bundlePath, `${leafPem}\n${caPem}\n`)
    return bundlePath
}

/**
 * Resolve a PEM bundle path for NODE_EXTRA_CA_CERTS.
 *
 * @param {{
 *   remoteUrl: string
 *   bundlePath?: string
 *   explicitPath?: string
 * }} options
 * @returns {Promise<string>}
 */
export async function ensureCertBundle({
    remoteUrl,
    bundlePath = defaultBundlePath,
    explicitPath = process.env.AURORA_MCP_CA_CERTS ??
        process.env.NODE_EXTRA_CA_CERTS ??
        bundlePath,
}) {
    if (existsSync(explicitPath)) {
        if (
            explicitPath !== bundlePath ||
            pemHasUsableCert(readFileSync(explicitPath, "utf8"))
        ) {
            return explicitPath
        }
    } else if (explicitPath !== bundlePath) {
        throw new Error(
            `Missing TLS CA bundle at ${explicitPath}. ` +
                "Export your internal CA to that path or set AURORA_MCP_CA_CERTS."
        )
    }

    return buildBundle(remoteUrl, bundlePath)
}
