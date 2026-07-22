import { ReactNode, useMemo } from 'react';
import { Chatbot, FileExplorerPanel, useFileExplorerController } from '@asgard-js/react';
import '@asgard-js/react/style';
import { LaunchedSandbox, SandboxFsListResult } from '@asgard-js/core';
import { DemoWrapper } from '../../components/demo-wrapper';

const MOCK_ENDPOINT = `${typeof window !== 'undefined' ? window.location.origin : ''}/mock-asgard`;

/**
 * Verification route for the F-021 File Explorer side panel (Cycle 1).
 *
 * Uses the exported `<FileExplorerPanel>` in `fileExplorer="off"` consumer-placement mode, wired to an
 * in-memory fs (no backend). Verifies: the live-sandbox dropdown, the lazy tree (workingDirectory root),
 * FileView markdown preview ↔ textarea edit + save (dirty dot), and the open-file intent (the button calls
 * `controller.requestFile`, driving the same reveal path an arriving `open-file` card uses).
 */
const SANDBOXES: LaunchedSandbox[] = [
  {
    sandboxName: 'sbx-demo',
    sandboxBlueprintName: 'demo-workspace',
    workingDirectory: '/home/user/project',
    editorServerEnabled: true,
    browserEnabled: false,
  },
];

const DIRS: Record<string, SandboxFsListResult> = {
  '/home/user/project': {
    entries: [
      { name: 'src', isDir: true, sizeBytes: 0, mtimeUnix: 1_700_000_000, mode: 493 },
      { name: 'README.md', isDir: false, sizeBytes: 92, mtimeUnix: 1_700_000_000, mode: 420 },
      { name: 'notes.txt', isDir: false, sizeBytes: 34, mtimeUnix: 1_700_000_000, mode: 420 },
    ],
    truncated: false,
  },
  '/home/user/project/src': {
    entries: [
      { name: 'index.ts', isDir: false, sizeBytes: 48, mtimeUnix: 1_700_000_000, mode: 420 },
      { name: 'app.tsx', isDir: false, sizeBytes: 60, mtimeUnix: 1_700_000_000, mode: 420 },
    ],
    truncated: false,
  },
};

const FILES: Record<string, string> = {
  '/home/user/project/README.md':
    '# Demo Workspace\n\n這是 **File Explorer** 展示用的 in-memory 檔案。\n\n- 點資料夾展開\n- 點檔案預覽\n- 切到編輯打字（右上角出現未存圓點）',
  '/home/user/project/notes.txt': 'plain text note — 切到編輯試打字。',
  '/home/user/project/src/index.ts': 'export const greet = (n: string) => `hi ${n}`;\n',
  '/home/user/project/src/app.tsx': 'export function App() {\n  return <div>hello</div>;\n}\n',
};

export function FileExplorer(): ReactNode {
  const controller = useFileExplorerController({ open: true });

  const providers = useMemo(
    () => ({
      listDir: async (_sandbox: string, path: string): Promise<SandboxFsListResult> =>
        DIRS[path] ?? { entries: [], truncated: false },
      readFile: async (_sandbox: string, path: string): Promise<string> => FILES[path] ?? '',
      saveFile: async (): Promise<void> => undefined,
    }),
    [],
  );

  return (
    <DemoWrapper
      title="File Explorer Side Panel (F-021 Cycle 1)"
      description="Exported <FileExplorerPanel> (fileExplorer=off placement) over an in-memory fs. Dropdown + lazy tree (workingDirectory root), FileView markdown preview ↔ edit/save, and the open-file intent (button → controller.requestFile, same path an arriving open-file card uses)."
    >
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <div
          style={{
            flex: '1 1 26rem',
            minWidth: '20rem',
            height: '560px',
            border: '1px solid var(--asg-color-border, #e5e7eb)',
            borderRadius: '0.5rem',
            overflow: 'hidden',
          }}
        >
          <FileExplorerPanel
            sandboxes={SANDBOXES}
            controller={controller}
            listDir={providers.listDir}
            readFile={providers.readFile}
            saveFile={providers.saveFile}
          />
        </div>
        <div style={{ flex: '0 1 16rem' }}>
          <h4>open-file intent</h4>
          <p style={{ fontSize: '0.8rem', color: '#666' }}>
            模擬 agent 推來的 <code>sandbox://…/open-file</code> 卡片：點下去呼叫 <code>controller.requestFile</code>
            ，面板會在預覽區開啟該檔（與卡片抵達走同一條路）。
          </p>
          <button
            type="button"
            data-testid="simulate-open-file"
            onClick={() => controller.requestFile('sbx-demo', '/home/user/project/README.md')}
            style={{ padding: '0.4rem 0.75rem', cursor: 'pointer' }}
          >
            模擬 open-file 卡片 → README.md
          </button>
        </div>
      </div>

      <h3 style={{ marginTop: '1.5rem' }}>Built-in aside（fileExplorer=&quot;builtin&quot;）</h3>
      <p style={{ fontSize: '0.85rem', color: '#666' }}>
        真實 <code>&lt;Chatbot fileExplorer=&quot;builtin&quot;&gt;</code>：標題列右側的資料夾鈕 toggle 出右側
        aside（切進 chat 殼內、不 fixed），dropdown 由 <code>launchedSandboxes$</code>（metadata mock）驅動。
      </p>
      <div style={{ height: '560px' }}>
        <Chatbot
          title="File Explorer（builtin）"
          config={{ botProviderEndpoint: MOCK_ENDPOINT }}
          customChannelId="file-explorer-demo"
          fileExplorer="builtin"
        />
      </div>
    </DemoWrapper>
  );
}
