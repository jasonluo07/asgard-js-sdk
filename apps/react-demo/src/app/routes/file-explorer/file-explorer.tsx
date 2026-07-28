import { ReactNode, useMemo } from 'react';
import { Chatbot, FileExplorerPanel, useFileExplorerController } from '@asgard-js/react';
import '@asgard-js/react/style';
import { LaunchedSandbox, SandboxFsListResult } from '@asgard-js/core';
import { DemoWrapper } from '../../components/demo-wrapper';

const MOCK_ENDPOINT = `${typeof window !== 'undefined' ? window.location.origin : ''}/mock-asgard`;

/**
 * Verification route for the F-021 File Explorer side panel.
 *
 * Cycle 1: the live-sandbox dropdown, the lazy tree (workingDirectory root), FileView markdown preview ↔
 * textarea edit + save (dirty dot), and the open-file intent. Cycle 2: the mutation toolbar + right-click
 * context menu + copy/cut/paste clipboard (standalone panel over a mutable in-memory fs), and the empty-state
 * Nudge (built-in Chatbot on an empty-sandbox channel; clicking Nudge fills the dropdown via the mock).
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

// The chatbot theme defaults to a 375px-wide mobile shell, which leaves the built-in aside (flex 0 0 20rem,
// max-width 60%) too cramped to inspect. Widen it the same way the all-features-wide route does.
const WIDE_CHATBOT_THEME = { chatbot: { width: '100%', height: '100%' } };

interface MemEntry {
  name: string;
  isDir: boolean;
  sizeBytes: number;
}

const DIRS: Record<string, MemEntry[]> = {
  '/home/user/project': [
    { name: 'src', isDir: true, sizeBytes: 0 },
    { name: 'README.md', isDir: false, sizeBytes: 92 },
    { name: 'notes.txt', isDir: false, sizeBytes: 34 },
  ],
  '/home/user/project/src': [
    { name: 'index.ts', isDir: false, sizeBytes: 48 },
    { name: 'app.tsx', isDir: false, sizeBytes: 60 },
  ],
};

const FILES: Record<string, string> = {
  '/home/user/project/README.md':
    '# Demo Workspace\n\n這是 **File Explorer** 展示用的 in-memory 檔案。\n\n- 點資料夾展開\n- 點檔案預覽\n- 切到編輯打字（右上角出現未存圓點）\n- 工具列 / 右鍵選單：新增、重新命名、刪除、複製貼上',
  '/home/user/project/notes.txt': 'plain text note — 切到編輯試打字。',
  '/home/user/project/src/index.ts': 'export const greet = (n: string) => `hi ${n}`;\n',
  '/home/user/project/src/app.tsx': 'export function App() {\n  return <div>hello</div>;\n}\n',
};

function parentOf(path: string): string {
  const norm = path.replace(/\/+$/, '');
  const i = norm.lastIndexOf('/');

  return i > 0 ? norm.slice(0, i) : '/';
}

function baseOf(path: string): string {
  return path.replace(/\/+$/, '').split('/').pop() ?? path;
}

function addEntry(dir: string, name: string, isDir: boolean, sizeBytes: number): void {
  const list = DIRS[dir] ?? (DIRS[dir] = []);
  if (!list.some(e => e.name === name)) list.push({ name, isDir, sizeBytes });
}

function removeEntry(dir: string, name: string): void {
  if (DIRS[dir]) DIRS[dir] = DIRS[dir].filter(e => e.name !== name);
}

function copyTree(src: string, dst: string): void {
  if (src in FILES) {
    FILES[dst] = FILES[src];
    addEntry(parentOf(dst), baseOf(dst), false, FILES[dst].length);

    return;
  }

  for (const key of Object.keys(DIRS)) {
    if (key === src || key.startsWith(`${src}/`)) DIRS[dst + key.slice(src.length)] = DIRS[key].map(e => ({ ...e }));
  }

  for (const key of Object.keys(FILES)) {
    if (key.startsWith(`${src}/`)) FILES[dst + key.slice(src.length)] = FILES[key];
  }

  addEntry(parentOf(dst), baseOf(dst), true, 0);
}

function removeTree(path: string): void {
  delete FILES[path];
  for (const key of Object.keys(FILES)) if (key.startsWith(`${path}/`)) delete FILES[key];
  for (const key of Object.keys(DIRS)) if (key === path || key.startsWith(`${path}/`)) delete DIRS[key];
  removeEntry(parentOf(path), baseOf(path));
}

/**
 * Write to the mock sandbox fs from *outside* the panel, the way an agent would. Deliberately a raw
 * `PUT fs/file` rather than the panel's own save, so the reload we observe can only have come from
 * `fs/watch` (F-021 AC3).
 */
async function writeExternally(path: string): Promise<void> {
  const form = new FormData();
  form.append('file', new Blob([`agent 在 ${new Date().toLocaleTimeString()} 改寫了這個檔案。`]));

  await fetch(`${MOCK_ENDPOINT}/sandbox/sbx-demo/fs/file?path=${encodeURIComponent(path)}`, {
    method: 'PUT',
    body: form,
  });
}

export function FileExplorer(): ReactNode {
  const controller = useFileExplorerController({ open: true });

  const providers = useMemo(
    () => ({
      listDir: async (_sandbox: string, path: string): Promise<SandboxFsListResult> => ({
        entries: (DIRS[path] ?? []).map(e => ({ ...e, mtimeUnix: 1_700_000_000, mode: e.isDir ? 493 : 420 })),
        truncated: false,
      }),
      readFile: async (_sandbox: string, path: string): Promise<string> => FILES[path] ?? '',
      saveFile: async (_sandbox: string, path: string, text: string): Promise<void> => {
        FILES[path] = text;
        addEntry(parentOf(path), baseOf(path), false, text.length);
      },
      mkdir: async (_sandbox: string, path: string): Promise<void> => {
        if (!(path in DIRS)) DIRS[path] = [];

        addEntry(parentOf(path), baseOf(path), true, 0);
      },
      remove: async (_sandbox: string, path: string): Promise<void> => removeTree(path),
      copy: async (_sandbox: string, src: string, dst: string): Promise<void> => copyTree(src, dst),
      move: async (_sandbox: string, src: string, dst: string): Promise<void> => {
        copyTree(src, dst);
        removeTree(src);
      },
      upload: async (_sandbox: string, dir: string, file: File): Promise<void> => {
        const dst = `${dir.replace(/\/$/, '')}/${file.name}`;
        FILES[dst] = `（上傳的檔案：${file.name}）`;
        addEntry(dir, file.name, false, FILES[dst].length);
      },
      download: async (): Promise<void> => undefined,
    }),
    [],
  );

  return (
    <DemoWrapper
      title="File Explorer Side Panel (F-021)"
      description="Cycle 1：dropdown + lazy tree（workingDirectory root）、FileView 預覽↔編輯/存檔、open-file intent。Cycle 2：工具列 + 右鍵選單 + 複製/剪下/貼上（獨立面板走可變 in-memory fs），以及空狀態 Nudge（builtin Chatbot 空 sandbox 頻道，按下喚醒後透過 mock 補回 dropdown）。"
    >
      {/* DemoWrapper's `.content` is a flex *row* — without this single block wrapper every child below
          becomes a row item and the panel gets squeezed to ~1px. */}
      <div style={{ width: '100%', minWidth: 0 }}>
        <div
          style={{
            width: '100%',
            maxWidth: '32rem',
            height: '660px',
          }}
        >
          <FileExplorerPanel
            sandboxes={SANDBOXES}
            controller={controller}
            listDir={providers.listDir}
            readFile={providers.readFile}
            saveFile={providers.saveFile}
            mkdir={providers.mkdir}
            remove={providers.remove}
            copy={providers.copy}
            move={providers.move}
            upload={providers.upload}
            download={providers.download}
          />
        </div>
        <div style={{ marginTop: '1rem', maxWidth: '48rem' }}>
          <h4>Cycle 2：工具列 / 右鍵選單</h4>
          <p style={{ fontSize: '0.85rem', color: '#666' }}>
            上方工具列（左起）：新增資料夾 / 上傳 / 下載 ｜ 複製 / 剪下 / 貼上 / 刪除 …… 最右：重新整理。樹上
            <strong>右鍵</strong>叫出情境選單（依檔案 / 資料夾 /
            空白處給不同項目）；複製或剪下後貼到目標資料夾（剪下＋貼上＝搬移）。
          </p>
          <h4>open-file intent</h4>
          <p style={{ fontSize: '0.85rem', color: '#666' }}>
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

        <h3 style={{ marginTop: '1.5rem' }}>Built-in aside（fileExplorer=&quot;builtin&quot;）</h3>
        <p style={{ fontSize: '0.85rem', color: '#666' }}>
          真實 <code>&lt;Chatbot fileExplorer=&quot;builtin&quot;&gt;</code>：標題列右側的資料夾鈕 toggle 出右側
          aside（切進 chat 殼內、不 fixed），dropdown 由 <code>launchedSandboxes$</code>（metadata mock）驅動；工具列 /
          右鍵選單透過真實 fs mock 端點（mkdir / item / all / copy / move）操作。
        </p>
        <div style={{ height: '560px' }}>
          <Chatbot
            title="File Explorer（builtin）"
            config={{ botProviderEndpoint: MOCK_ENDPOINT }}
            customChannelId="file-explorer-demo"
            fileExplorer="builtin"
            theme={WIDE_CHATBOT_THEME}
          />
        </div>

        <h4 style={{ marginTop: '1rem' }}>watch-and-reload（F-021 AC3）</h4>
        <p style={{ fontSize: '0.85rem', color: '#666' }}>
          在上面的 builtin aside 裡開啟 <code>notes.txt</code> 的預覽，然後按這顆鈕：它繞過面板、直接對 mock 端點
          <code>PUT fs/file</code>（等同 agent 在 sandbox 裡改檔）。mock 的 <code>fs/watch</code> SSE 推一則
          <code>change</code>，FileView 隨即重讀、內容就地換掉——不必按重新整理。編輯中（右上有未存圓點）時會
          <strong>跳過</strong>重載，不會蓋掉還沒存的內容。
        </p>
        <button
          type="button"
          data-testid="simulate-agent-write"
          onClick={() => void writeExternally('/home/user/project/notes.txt')}
          style={{ padding: '0.4rem 0.75rem', cursor: 'pointer' }}
        >
          模擬 agent 寫入 notes.txt
        </button>

        <h3 style={{ marginTop: '1.5rem' }}>空狀態 Nudge（F-021 AC4）</h3>
        <p style={{ fontSize: '0.85rem', color: '#666' }}>
          這個頻道的 metadata 一開始<strong>沒有</strong>執行中的 sandbox：開啟 aside 會看到「目前沒有執行中的
          sandbox」＋
          <strong>喚醒 sandbox</strong> 按鈕。按下去送出 <code>action=NUDGE</code>
          （空白、不可見的一輪、聊天室不顯示回覆）， mock 回 <code>sandbox.launch → ready</code>，SDK 自動 refetch
          metadata，dropdown 隨即補回。
        </p>
        <div style={{ height: '480px' }}>
          <Chatbot
            title="File Explorer（Nudge 空狀態）"
            config={{ botProviderEndpoint: MOCK_ENDPOINT }}
            customChannelId="file-explorer-empty-demo"
            fileExplorer="builtin"
            theme={WIDE_CHATBOT_THEME}
          />
        </div>
      </div>
    </DemoWrapper>
  );
}
