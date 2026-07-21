// F-020 — the typed intent a `sandbox://` custom URI resolves to. The host runs the side effect from this
// (open-browser → one-time browser URL; open-file → File Explorer preview); it is never a browsable URL.
export type SandboxUriIntent =
  | { kind: 'open-browser'; sandboxName: string }
  | { kind: 'open-file'; sandboxName: string; absolutePath: string };

/**
 * Parse `sandbox://<name>/<action>?<query>` into a typed {@link SandboxUriIntent} (F-020 / UC-036).
 * Returns `null` for an unknown action, a missing `absolute_path`, or a non-`sandbox://` / malformed URI —
 * the host must then treat it as a plain card and never `window.open()` the raw scheme.
 *
 * A hand-written regex (not `new URL()`) is used deliberately: absolute paths carry many `/`, and a
 * non-special scheme's host casing is unreliable under the WHATWG URL parser; the query is still handed to
 * `URLSearchParams` (which decodes).
 */
export function resolveSandboxUri(uri: string): SandboxUriIntent | null {
  const match = /^sandbox:\/\/([^/]+)\/([^?#]+)(?:\?([^#]*))?/.exec(uri.trim());
  if (!match) return null;

  const sandboxName = decodeURIComponent(match[1]);
  const action = match[2];
  const params = new URLSearchParams(match[3] ?? '');

  if (action === 'open-browser') return { kind: 'open-browser', sandboxName };

  if (action === 'open-file') {
    const absolutePath = params.get('absolute_path'); // URLSearchParams already decodes
    if (!absolutePath) return null;

    return { kind: 'open-file', sandboxName, absolutePath };
  }

  return null; // unknown action: do not guess, hand back to the host
}
