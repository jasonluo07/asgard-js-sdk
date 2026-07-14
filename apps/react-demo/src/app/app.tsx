import { Routes, Route } from 'react-router-dom';
import { Layout } from './components/layout';
import { Home } from './routes/home';
import { Templates } from './routes/templates';
import { DataInsightStyle } from './routes/data-insight-style';
import { Features } from './routes/features';
import { Theme } from './routes/theme';
import { Auth } from './routes/auth';
import { Events } from './routes/events';
import { Fullscreen } from './routes/fullscreen';
import { Markdown } from './routes/markdown';
import { MarkdownTable } from './routes/markdown-table';
import { KeepConnection } from './routes/keep-connection';
import { Private } from './routes/private';
import { CustomRenderer } from './routes/custom-renderer';
import { BeforeSendMessage } from './routes/before-send-message';
import { CustomHeaderDemo } from './routes/custom-header';
import { AutoResetChannel } from './routes/auto-reset-channel';
import { RenderMenu } from './routes/render-menu';
import { HttpErrorDemo } from './routes/http-error';
import { HttpErrorOnSendDemo } from './routes/http-error-on-send';
import { ToolCallDemo } from './routes/tool-call';
import { ToolCallConsentDemo } from './routes/tool-call-consent';
import { UserIdentityHint } from './routes/user-identity-hint';
import { OnChannelReady } from './routes/on-channel-ready';
import { FooterEndActions } from './routes/footer-end-actions';
import { RenderFooter } from './routes/render-footer';
import { TextNewlines } from './routes/text-newlines';
import { HistoryScrollBug } from './routes/history-scroll-bug';
import { CwdDownload } from './routes/cwd-download';
import { UploadMimeConstraint } from './routes/upload-mime-constraint';
import { StreamRobustness } from './routes/stream-robustness';
import { StreamResume } from './routes/stream-resume';
import { TranscriptReplay } from './routes/transcript-replay';
import { Thinking } from './routes/thinking';
import { RunIndicator } from './routes/run-indicator';
import { ToolCallVariants } from './routes/tool-call-variants';
import { ToolCallI18n } from './routes/tool-call-i18n';
import { ToolCallGrouping } from './routes/tool-call-grouping';
import { ToolCallDiff } from './routes/tool-call-diff';
import { ToolCallExpand } from './routes/tool-call-expand';
import { ToolCallIsError } from './routes/tool-call-iserror';
import { TaskListRoute } from './routes/task-list';

export function App(): React.ReactElement {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/templates" element={<Templates />} />
        <Route path="/data-insight-style" element={<DataInsightStyle />} />
        <Route path="/features" element={<Features />} />
        <Route path="/theme" element={<Theme />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/events" element={<Events />} />
        <Route path="/fullscreen" element={<Fullscreen />} />
        <Route path="/markdown" element={<Markdown />} />
        <Route path="/markdown-table" element={<MarkdownTable />} />
        <Route path="/keep-connection" element={<KeepConnection />} />
        <Route path="/private" element={<Private />} />
        <Route path="/custom-renderer" element={<CustomRenderer />} />
        <Route path="/before-send-message" element={<BeforeSendMessage />} />
        <Route path="/custom-header" element={<CustomHeaderDemo />} />
        <Route path="/auto-reset-channel" element={<AutoResetChannel />} />
        <Route path="/render-menu" element={<RenderMenu />} />
        <Route path="/http-error" element={<HttpErrorDemo />} />
        <Route path="/http-error-on-send" element={<HttpErrorOnSendDemo />} />
        <Route path="/tool-call" element={<ToolCallDemo />} />
        <Route path="/tool-call-consent" element={<ToolCallConsentDemo />} />
        <Route path="/user-identity-hint" element={<UserIdentityHint />} />
        <Route path="/on-channel-ready" element={<OnChannelReady />} />
        <Route path="/footer-end-actions" element={<FooterEndActions />} />
        <Route path="/render-footer" element={<RenderFooter />} />
        <Route path="/text-newlines" element={<TextNewlines />} />
        <Route path="/history-scroll-bug" element={<HistoryScrollBug />} />
        <Route path="/cwd-download" element={<CwdDownload />} />
        <Route path="/upload-mime-constraint" element={<UploadMimeConstraint />} />
        <Route path="/stream-robustness" element={<StreamRobustness />} />
        <Route path="/stream-resume" element={<StreamResume />} />
        <Route path="/transcript-replay" element={<TranscriptReplay />} />
        <Route path="/thinking" element={<Thinking />} />
        <Route path="/run-indicator" element={<RunIndicator />} />
        <Route path="/tool-call-variants" element={<ToolCallVariants />} />
        <Route path="/tool-call-i18n" element={<ToolCallI18n />} />
        <Route path="/tool-call-grouping" element={<ToolCallGrouping />} />
        <Route path="/tool-call-diff" element={<ToolCallDiff />} />
        <Route path="/tool-call-expand" element={<ToolCallExpand />} />
        <Route path="/tool-call-iserror" element={<ToolCallIsError />} />
        <Route path="/task-list" element={<TaskListRoute />} />
      </Routes>
    </Layout>
  );
}

export default App;
