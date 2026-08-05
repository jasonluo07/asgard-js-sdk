// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ReactNode } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { AsgardTemplateContextProvider } from '../../context/asgard-template-context';
import { useFileExplorerController } from '../../hooks/use-file-explorer-controller';
import { FileExplorerPanel } from './file-explorer/file-explorer-panel';
import { Locale, t } from '../../i18n';

/**
 * asgard-js-sdk#387 — `<Chatbot locale>` localized the chat column but not the built-in File Explorer.
 * The template provider sat inside `renderContent()`, i.e. inside the chat column, while F-021 AC6 had
 * moved the File Explorer aside (and `DropZoneOverlay`) out to be siblings of that column. Both therefore
 * read `useAsgardTemplateContext()`'s default and rendered `en-US` no matter what the consumer passed.
 *
 * Mounting the authenticated `<Chatbot>` here would require a live `AsgardServiceClient` (SSE), so the
 * wiring is pinned structurally — the same source-inspection idiom `file-explorer-i18n.spec.tsx` uses for
 * the native-dialog and hardcoded-string regressions.
 */

const CHATBOT_SRC = readFileSync(join(__dirname, 'chatbot.tsx'), 'utf-8');

/** The provider's children, as source text. Empty string if the provider is missing. */
function templateProviderSubtree(): string {
  const open = CHATBOT_SRC.indexOf('<AsgardTemplateContextProvider');
  const close = CHATBOT_SRC.indexOf('</AsgardTemplateContextProvider>');

  return open === -1 || close === -1 ? '' : CHATBOT_SRC.slice(open, close);
}

describe('#387 template context scope', () => {
  it('declares exactly one AsgardTemplateContextProvider', () => {
    const opens = CHATBOT_SRC.match(/<AsgardTemplateContextProvider\b/g) ?? [];
    const closes = CHATBOT_SRC.match(/<\/AsgardTemplateContextProvider>/g) ?? [];

    expect(opens, 'a second provider means one subtree silently wins over the other').toHaveLength(1);
    expect(closes).toHaveLength(1);
  });

  /**
   * The invariant that actually fixes #387: everything the authenticated tree renders — the chat column
   * AND its siblings — has to be inside the provider. Asserting on the subtree rather than on raw indices
   * keeps this honest; `</ChatbotContainer>` also appears in the non-authenticated return further down the
   * file, which has neither a service nor a template provider by design.
   */
  it('encloses ChatbotContainer, so siblings of the chat column inherit locale', () => {
    expect(templateProviderSubtree(), 'ChatbotContainer must render inside the provider').toContain(
      '<ChatbotContainer',
    );
  });

  it('keeps the File Explorer aside and the drop zone inside that provider', () => {
    const subtree = templateProviderSubtree();

    expect(subtree, 'the File Explorer aside must inherit locale').toContain('<ChatbotFileExplorerAside');
    expect(subtree, 'the drop-zone overlay must inherit locale').toContain('<DropZoneOverlay />');
  });
});

describe('#387 File Explorer follows the template context', () => {
  afterEach(cleanup);

  /**
   * With no sandboxes the panel renders its empty state, which is pure catalog text — no fs calls, so the
   * mutation props stay unused and the assertion is about locale resolution only.
   */
  function Panel(): ReactNode {
    const controller = useFileExplorerController({ open: true });

    return (
      <FileExplorerPanel
        sandboxes={[]}
        controller={controller}
        listDir={async () => ({ entries: [], truncated: false })}
      />
    );
  }

  const cases: { name: string; locale?: Locale; expected: Locale }[] = [
    { name: 'renders the panel in the locale the surrounding context declares', locale: 'zh-TW', expected: 'zh-TW' },
    { name: 'falls back to en-US when no locale is declared', expected: 'en-US' },
  ];

  for (const { name, locale, expected } of cases) {
    it(name, () => {
      render(
        <AsgardTemplateContextProvider locale={locale}>
          <Panel />
        </AsgardTemplateContextProvider>,
      );

      expect(screen.getByText(t(expected, 'fileExplorer.noSandboxTitle'))).toBeTruthy();
    });
  }
});
