// @vitest-environment jsdom
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { ToolCallConsentEventData } from '@asgard-js/core';

/**
 * #409 — the "Wake a sandbox" button in the File Explorer's empty state was gated on `isRunning`
 * alone. During a consent pause the run has already ended (the consent frame precedes the terminal),
 * so `isRunning` is false and the button stayed live — but core refuses the nudge (#407).
 *
 * This state is hard to reach in a browser: the empty state needs zero live sandboxes, while the
 * consent bot that produces a pending prompt also launches one. So the wiring is pinned here instead.
 */

const ctx = vi.hoisted(() => ({
  value: {} as Record<string, unknown>,
}));

vi.mock('../../../context/asgard-service-context', () => ({
  useAsgardContext: (): Record<string, unknown> => ctx.value,
}));

// No live sandboxes → FileExplorerPanel renders its empty state, which is where the nudge button lives.
vi.mock('../../../hooks/use-derived-state', () => ({
  useLaunchedSandboxes: (): unknown[] => [],
}));

const { ChatbotFileExplorerAside } = await import('./chatbot-file-explorer');

const CONTROLLER = {
  open: true,
  activeSandboxName: null,
  requestedFile: null,
  isEditingDirty: false,
  openExplorer: vi.fn(),
  closeExplorer: vi.fn(),
  toggleExplorer: vi.fn(),
  setActiveSandboxName: vi.fn(),
  requestFile: vi.fn(),
  clearRequestedFile: vi.fn(),
  setEditingDirty: vi.fn(),
} as unknown as Parameters<typeof ChatbotFileExplorerAside>[0]['controller'];

const PENDING: ToolCallConsentEventData = {
  processId: 'proc-1',
  pendingCalls: [{ toolCallId: 'call-1', toolsetName: 'shell', toolName: 'run', parameter: {}, alreadyAllowed: false }],
};

function renderWith(state: { isRunning: boolean; pendingConsent: ToolCallConsentEventData | null }): string {
  ctx.value = {
    client: {},
    channel: null,
    nudge: vi.fn(),
    isRunning: state.isRunning,
    pendingConsent: state.pendingConsent,
  };

  return renderToStaticMarkup(<ChatbotFileExplorerAside controller={CONTROLLER} />);
}

/** The wake button is the only one carrying that label; grab its rendered tag. */
function wakeButtonTag(html: string): string {
  const idx = html.indexOf('Wake a sandbox');
  expect(idx, 'empty state with the wake button should be rendered').toBeGreaterThan(-1);

  return html.slice(0, idx).slice(html.slice(0, idx).lastIndexOf('<button'));
}

describe('#409 — nudge entry point during a consent pause', () => {
  it('disables the wake button while a consent is pending, even though no run is in flight', () => {
    const html = renderWith({ isRunning: false, pendingConsent: PENDING });

    expect(wakeButtonTag(html)).toContain('disabled');
  });

  it('still disables it while a run is in flight (pre-existing F-023 AC6 gate)', () => {
    const html = renderWith({ isRunning: true, pendingConsent: null });

    expect(wakeButtonTag(html)).toContain('disabled');
  });

  it('leaves it enabled when the channel is genuinely idle', () => {
    const html = renderWith({ isRunning: false, pendingConsent: null });

    expect(wakeButtonTag(html)).not.toContain('disabled');
  });
});
