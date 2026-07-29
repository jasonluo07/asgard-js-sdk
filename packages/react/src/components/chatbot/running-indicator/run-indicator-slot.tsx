import { ReactNode } from 'react';
import { useAsgardContext } from '../../../context/asgard-service-context';
import { RunningIndicator } from './running-indicator';

// BUILD-034 — the connected seam. It lives in the chat column, immediately above the footer slot, rather
// than inside `ChatbotFooter`: the indicator is bound to `isRunning` (the whole connection) and has nothing
// to do with the composer's internals. Keeping it in the footer meant `renderFooter` — which replaces that
// component entirely — silently took the run indicator with it, which is what heimdall-pm#200 reported.
//
// This has to be its own component rather than a `useAsgardContext()` call in `Chatbot`: the JSX there is
// produced by a function invoked as `AsgardServiceContextProvider`'s children, so the hook would run in
// `Chatbot`'s own render, above the provider, and read the wrong value.
export function RunIndicatorSlot(): ReactNode {
  const { isRunning } = useAsgardContext();

  return <RunningIndicator running={isRunning} />;
}

export default RunIndicatorSlot;
