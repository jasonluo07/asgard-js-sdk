import type { ResolvedCanvasTheme } from './resolve-canvas-theme';

// F-030 — the document that lives inside the canvas iframe, assembled as a string for `srcdoc`.
//
// **Why an iframe at all.** The fragment is model-generated content that may contain `<style>` and
// `<script>`. Injecting it into the host page would hand that page's origin — its cookies, its
// storage, its DOM — to content the host did not author, and this SDK is embedded in customers' own
// sites. The only correct answer is a separate browsing context that may run scripts but is denied
// same-origin access.
//
// **The trap:** `sandbox="allow-scripts allow-same-origin"` together is equivalent to no sandbox at
// all — scripts inside can then reach the parent's DOM directly. The component gives `allow-scripts`
// only, so the frame gets an opaque origin and can touch nothing of the host's.
//
// **Why a CSP on top.** `default-src 'none'` keeps the canvas off the network. That blocks a missing
// CDN chart library (the backend already requires self-contained fragments; this makes it a hard
// guarantee) and, far more importantly, blocks exfiltration — a product wired to customer databases
// cannot let model-written markup POST what it just read.
//
// `'unsafe-inline'` is what the canvas's own `<style>` / `<script>` and this runtime need. It is the
// canvas's entire capability surface, and it is exercised inside an opaque origin — "can run script"
// is not "can reach the host".

/**
 * The in-iframe runtime, embedded as a string.
 *
 * It does three things: receive `postMessage`, morph markup into `#root`, and report height plus
 * whether anything is visible yet. It deliberately never touches `localStorage` — under an opaque
 * origin that throws `SecurityError`.
 *
 * The morph is hand-written rather than pulled from a library because this has to ship as a *string*
 * inside `srcdoc`; adding a bundling step for a 60-line diff is not worth it. It **moves** nodes out
 * of the freshly parsed tree instead of calling `createElement`, so SVG namespaces are whatever the
 * browser's parser decided and never hit the `createElement` vs `createElementNS` trap.
 */
const RUNTIME = String.raw`
(function () {
  var root = document.getElementById('root');
  var lastFinal = false;

  function morph(cur, next) {
    var a = cur.firstChild, b = next.firstChild;
    while (a || b) {
      var an = a ? a.nextSibling : null;
      var bn = b ? b.nextSibling : null;
      if (!b) { cur.removeChild(a); }
      else if (!a) { cur.appendChild(b); }
      else if (a.nodeType !== b.nodeType || a.nodeName !== b.nodeName) { cur.replaceChild(b, a); }
      else if (a.nodeType === 3) { if (a.nodeValue !== b.nodeValue) a.nodeValue = b.nodeValue; }
      else if (a.nodeType === 1) {
        if (a.nodeName === 'STYLE' || a.nodeName === 'SCRIPT') {
          if (a.textContent !== b.textContent) a.textContent = b.textContent;
        } else {
          syncAttrs(a, b);
          morph(a, b);
        }
      }
      a = an; b = bn;
    }
  }

  function syncAttrs(a, b) {
    var i, at;
    for (i = a.attributes.length - 1; i >= 0; i--) {
      at = a.attributes[i];
      if (!b.hasAttribute(at.name)) a.removeAttribute(at.name);
    }
    for (i = 0; i < b.attributes.length; i++) {
      at = b.attributes[i];
      if (a.getAttribute(at.name) !== at.value) a.setAttribute(at.name, at.value);
    }
  }

  // A <script> inserted via innerHTML never runs. Clone each into a fresh node so the browser
  // executes it — once, and only when the fragment is final: running mid-stream would execute
  // against half a tree.
  function runScripts() {
    var list = root.querySelectorAll('script');
    for (var i = 0; i < list.length; i++) {
      var old = list[i], s = document.createElement('script');
      for (var j = 0; j < old.attributes.length; j++) {
        s.setAttribute(old.attributes[j].name, old.attributes[j].value);
      }
      s.textContent = old.textContent || '';
      old.parentNode.replaceChild(s, old);
    }
  }

  function apply(html, final) {
    var next = document.createElement('div');
    next.innerHTML = html;
    morph(root, next);
    if (final && !lastFinal) { lastFinal = true; runScripts(); }
    report();
  }

  function report() {
    var h = Math.ceil(document.documentElement.getBoundingClientRect().height);
    parent.postMessage({ __asgardCanvas: 'height', height: h, visible: anyVisible() }, '*');
  }

  // "Is there anything to look at yet" = does #root hold a node other than <style>/<script>.
  //
  // It must NOT be decided by #root's height: #root has padding, so an empty one still measures
  // greater than zero and the skeleton would never appear.
  function anyVisible() {
    for (var i = 0; i < root.childNodes.length; i++) {
      var n = root.childNodes[i];
      if (n.nodeType === 3 && n.nodeValue && n.nodeValue.trim()) return true;
      if (n.nodeType === 1 && n.nodeName !== 'STYLE' && n.nodeName !== 'SCRIPT') return true;
    }
    return false;
  }
  if (window.ResizeObserver) new ResizeObserver(report).observe(document.documentElement);

  window.addEventListener('message', function (e) {
    // Under an opaque origin e.origin is the string "null" and proves nothing; check the source.
    if (e.source !== parent) return;
    var d = e.data;
    if (!d) return;
    if (d.__asgardCanvas === 'content') { apply(d.html || '', !!d.final); return; }
    // Theme has its own channel rather than a srcdoc reset — a reset rebuilds the whole document and
    // wipes everything already drawn.
    if (d.__asgardCanvas === 'theme') {
      var st = document.getElementById('theme');
      if (st) st.textContent = themeCss(d);
      report();
    }
  });

  // The palette reaches the fragment as custom properties. They must be re-declared *inside* the
  // iframe: custom properties on the host's :root do not cross the frame boundary, and the failure
  // is silent.
  function themeCss(t) {
    return ':root{'
      + '--canvas-fg:' + t.fg + ';'
      + '--canvas-bg:' + t.bg + ';'
      + '--canvas-accent:' + t.accent + ';'
      + '--canvas-muted:' + t.muted + ';'
      + '--canvas-border:' + t.border + ';}'
      + 'html,body{background:var(--canvas-bg);color:var(--canvas-fg);}'
      + '#root{padding:' + t.padding + ';}'
      + '::selection{background:' + t.selection + ';}';
  }

  parent.postMessage({ __asgardCanvas: 'ready' }, '*');
})();
`;

/**
 * Assembles the iframe document for a resolved theme.
 *
 * The theme must be **concrete color values**. The iframe is a separate document, so the host's
 * custom properties are invisible inside it — writing `var(--fg, …)` there falls back every time, and
 * the background must be stated explicitly or the frame is simply white.
 */
export function buildCanvasSrcDoc(theme: ResolvedCanvasTheme): string {
  return `<!doctype html><html><head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src data:; font-src data:;">
<style>
  html,body{margin:0;padding:0;
    font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",sans-serif;}
</style>
<style id="theme">
  :root{--canvas-fg:${theme.fg};--canvas-bg:${theme.bg};--canvas-accent:${theme.accent};
        --canvas-muted:${theme.muted};--canvas-border:${theme.border};}
  html,body{background:var(--canvas-bg);color:var(--canvas-fg);}
  #root{padding:${theme.padding};}
  ::selection{background:${theme.selection};}
</style>
</head><body><div id="root"></div><script>${RUNTIME}</scr${''}ipt></body></html>`;
}
