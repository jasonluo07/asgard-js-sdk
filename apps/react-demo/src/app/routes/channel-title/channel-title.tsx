import { memo, ReactNode, useMemo, useRef, useState } from 'react';
import { BehaviorSubject, distinctUntilChanged } from 'rxjs';
import { Channel } from '@asgard-js/core';
import { useChannelTitle } from '@asgard-js/react';
import { DemoWrapper } from '../../components/demo-wrapper';
import styles from './channel-title.module.scss';

// F-016 — render the channel title OUTSIDE the Chatbot via `useChannelTitle`. The title lives on the
// Channel (seed + live `title.update`), exposed as a `distinctUntilChanged` store: a same-title event
// does not re-render the consumer (render badge stays). A stub mirrors the Channel's title store so the
// real hook works without a live SSE connection.

const TitlePanel = memo(function TitlePanel({ channel }: { channel: Channel }): ReactNode {
  const renders = useRef(0);
  renders.current += 1;
  const title = useChannelTitle(channel);

  return (
    <div className={styles.panel}>
      <div className={styles.panel__head}>
        <span>頻道標題（框外渲染）</span>
        <span className={styles.badge}>render × {renders.current}</span>
      </div>
      {title === null ? (
        <div className={styles.empty}>（未命名 · null）</div>
      ) : (
        <div className={styles.title}>{title}</div>
      )}
    </div>
  );
});

export function ChannelTitleRoute(): ReactNode {
  const [log, setLog] = useState<string[]>([]);

  const { titleSubject, channelStub } = useMemo(() => {
    const titleSubject = new BehaviorSubject<string | null>(null);
    const channelStub = {
      channelTitle$: titleSubject.pipe(distinctUntilChanged()),
      getChannelTitle: () => titleSubject.value,
    } as unknown as Channel;

    return { titleSubject, channelStub };
  }, []);

  const push = (title: string | null, label: string): void => {
    titleSubject.next(title);
    setLog(l => [label, ...l].slice(0, 6));
  };

  return (
    <DemoWrapper
      title="Channel Title Store (F-016)"
      description="channel title 是動態狀態：由 metadata seed、由 asgard.channel.title.update 即時更新，以逐切片 channelTitle$（distinctUntilChanged）對外暴露。使用端可在聊天框外訂閱自渲染；同名事件不會觸發重畫。"
    >
      <div className={styles.controls}>
        <div className={styles.buttons}>
          <button type="button" onClick={(): void => push('訂單查詢', 'seed / title.update → 「訂單查詢」')}>
            title.update →「訂單查詢」
          </button>
          <button type="button" onClick={(): void => push('庫存分析', 'title.update → 「庫存分析」')}>
            title.update →「庫存分析」
          </button>
          <button type="button" onClick={(): void => push('庫存分析', '同名 title.update（應不重畫）')}>
            同名 title.update（不重畫）
          </button>
          <button type="button" onClick={(): void => push(null, '清空 → null（未命名）')}>
            清空（null）
          </button>
        </div>
        <p className={styles.hint}>
          觀察 <code>render ×</code> 徽章：換標題才 +1，按「同名」不 +1（<code>distinctUntilChanged</code> 擋掉）。
        </p>
      </div>

      <TitlePanel channel={channelStub} />

      <div className={styles.logBox}>
        <div className={styles.logBox__title}>事件記錄</div>
        <ol className={styles.log}>
          {log.map((entry, i) => (
            <li key={`${i}-${entry}`}>{entry}</li>
          ))}
        </ol>
      </div>
    </DemoWrapper>
  );
}
