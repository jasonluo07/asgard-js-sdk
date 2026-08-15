import { ReactNode, useEffect, useMemo, useState } from 'react';
import { SourceSetFileExplorer } from '@asgard-js/react';
import '@asgard-js/react/style';
import { DemoWrapper } from '../../components/demo-wrapper';
import { installMockVolume, MOCK_ENDPOINT } from './volume-mock';
import styles from './source-set-explorer.module.scss';

/**
 * TASK-004 — the SourceSet File Explorer mounted on its own, with no Chatbot anywhere on the page.
 *
 * Two mounts side by side rather than one behind a toggle: the narrow column is the width a host aside
 * actually gives this component (where ten toolbar buttons wrap), and the wide one is how Platform and
 * Agent Hub mount it. What matters is comparing them, and a toggle makes you hold one in your head.
 *
 * With no `VITE_SOURCE_SET_ENDPOINT` set the route runs against an in-memory volume, so every action is
 * exercisable without credentials. Setting that variable points both mounts at a real volume instead.
 */

const REAL_ENDPOINT = import.meta.env.VITE_SOURCE_SET_ENDPOINT as string | undefined;
const REAL_API_KEY = import.meta.env.VITE_SOURCE_SET_API_KEY as string | undefined;
const REAL_AUTH_TOKEN = import.meta.env.VITE_SOURCE_SET_AUTH_TOKEN as string | undefined;

const LOCALES = ['en-US', 'zh-TW', 'ja-JP'] as const;

type DemoLocale = (typeof LOCALES)[number];

export function SourceSetExplorerRoute(): ReactNode {
  const usingMock = !REAL_ENDPOINT;
  const [ready, setReady] = useState(!usingMock);
  const [readOnly, setReadOnly] = useState(false);
  const [locale, setLocale] = useState<DemoLocale>('en-US');
  const [rootPath, setRootPath] = useState('');

  // Patch `fetch` only while this route is mounted, so navigating away leaves the rest of the demo alone.
  useEffect(() => {
    if (!usingMock) return;

    const restore = installMockVolume();
    setReady(true);

    return (): void => {
      setReady(false);
      restore();
    };
  }, [usingMock]);

  const connection = useMemo(
    () => ({
      sourceSetEndpoint: REAL_ENDPOINT ?? MOCK_ENDPOINT,
      apiKey: REAL_ENDPOINT ? REAL_API_KEY : undefined,
      customHeaders: REAL_ENDPOINT && REAL_AUTH_TOKEN ? { Authorization: `Bearer ${REAL_AUTH_TOKEN}` } : undefined,
    }),
    [],
  );

  return (
    <DemoWrapper
      title="SourceSet File Explorer"
      description="A standalone file explorer mounted straight on a SourceSet volume — no chat, no sandbox. Configured entirely by props."
    >
      <div className={styles.stack}>
        <div className={styles.controls}>
          <label className={styles.control}>
            <input type="checkbox" checked={readOnly} onChange={event => setReadOnly(event.target.checked)} />
            readOnly
          </label>

          <label className={styles.control}>
            locale
            <select value={locale} onChange={event => setLocale(event.target.value as DemoLocale)}>
              {LOCALES.map(value => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.control}>
            rootPath
            <input
              type="text"
              value={rootPath}
              placeholder="(volume root)"
              onChange={event => setRootPath(event.target.value)}
            />
          </label>

          <span className={styles.source}>
            {usingMock ? 'in-memory mock volume' : `live volume · ${new URL(REAL_ENDPOINT ?? '').host}`}
          </span>
        </div>

        <p className={styles.hint}>
          Try: <code>notes/</code> for markdown and plain text · <code>logo.png</code> for the image branch ·{' '}
          <code>empty/</code> for the empty-directory state · <code>paged/</code> for a 1,200-entry directory that pages
          twice and still loads completely · <code>overclaimed/</code> for one where the volume claims more than it
          serves, which is where the “not loaded” notice appears.
        </p>

        {ready ? (
          <div className={styles.mounts}>
            <section className={styles.narrow}>
              <h3 className={styles.mountTitle}>Narrow — 320px aside</h3>
              <div className={styles.mountBody}>
                <SourceSetFileExplorer
                  key={`narrow:${rootPath}`}
                  sourceSetEndpoint={connection.sourceSetEndpoint}
                  apiKey={connection.apiKey}
                  customHeaders={connection.customHeaders}
                  rootPath={rootPath}
                  readOnly={readOnly}
                  locale={locale}
                />
              </div>
            </section>

            <section className={styles.wide}>
              <h3 className={styles.mountTitle}>Full-bleed — how Platform and Agent Hub mount it</h3>
              <div className={styles.mountBody}>
                <SourceSetFileExplorer
                  key={`wide:${rootPath}`}
                  sourceSetEndpoint={connection.sourceSetEndpoint}
                  apiKey={connection.apiKey}
                  customHeaders={connection.customHeaders}
                  rootPath={rootPath}
                  readOnly={readOnly}
                  locale={locale}
                />
              </div>
            </section>
          </div>
        ) : (
          <p className={styles.hint}>Starting the mock volume…</p>
        )}
      </div>
    </DemoWrapper>
  );
}

export default SourceSetExplorerRoute;
