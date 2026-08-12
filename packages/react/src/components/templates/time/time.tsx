import { ReactNode } from 'react';

export interface TimeProps {
  /** @deprecated Ignored — nothing is rendered. */
  time?: Date;
  /** @deprecated Ignored — nothing is rendered. */
  className?: string;
}

/**
 * @deprecated Renders nothing. The chat surface no longer shows message timestamps anywhere (#422), so
 * this is a no-op kept only so existing callers keep compiling; delete your `<Time />` when convenient.
 *
 * The value it used to render was never the message's own time: the SDK stamped `new Date()` as each
 * frame arrived, and a GET rejoin replays the whole history at once, so every replayed message was
 * re-stamped with the moment the page opened. The backend carries no timestamp to put in its place.
 */
export function Time(_props: TimeProps): ReactNode {
  return null;
}
