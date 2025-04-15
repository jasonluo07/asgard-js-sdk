import {
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Marked, Tokens, Lexer } from 'marked';
import { markedHighlight } from 'marked-highlight';
import hljs from 'highlight.js';
import DOMPurify from 'dompurify';
import classes from './text-template.module.scss';

const marked = new Marked(
  markedHighlight({
    emptyLangClass: 'hljs',
    langPrefix: 'hljs language-',
    highlight(code: any, lang: any, info: any) {
      const language = hljs.getLanguage(lang) ? lang : 'plaintext';

      return hljs.highlight(code, { language }).value;
    },
  })
);

interface MarkdownRenderResult {
  htmlBlocks: ReactNode;
  lastTypingText: string;
}

type Token =
  | Tokens.Heading
  | Tokens.Paragraph
  | Tokens.List
  | Tokens.Text
  | Tokens.Space
  | Tokens.Code
  | Tokens.Blockquote
  | Tokens.Table
  | Tokens.HTML;

function isCompleteParagraph(raw: string): boolean {
  return (
    raw.trim().endsWith('\n\n') ||
    raw.trim().endsWith('.') ||
    raw.trim().endsWith('。')
  );
}

export function useMarkdownRenderer(
  markdownText: string,
  delay = 100
): MarkdownRenderResult {
  const [blocks, setBlocks] = useState<string[]>([]);
  const [typingText, setTypingText] = useState<string>('');

  const cacheRef = useRef<Map<string, string>>(new Map());

  const getRawText = useCallback((token: Token): string => {
    return token?.raw || (token as Tokens.HTML).text || '';
  }, []);

  useEffect(() => {
    if (!markdownText) {
      setBlocks([]);
      setTypingText('');
      cacheRef.current.clear();

      return;
    }

    const handler = setTimeout(() => {
      const tokens = Lexer.lex(markdownText) as Token[];
      if (tokens.length === 0) {
        setBlocks([]);
        setTypingText('');

        return;
      }

      let lastCompleteIndex = tokens.length - 1;
      for (let i = tokens.length - 1; i >= 0; i--) {
        const raw = getRawText(tokens[i]);
        if (isCompleteParagraph(raw)) {
          lastCompleteIndex = i;

          break;
        }
      }

      const finishedTokens = tokens.slice(0, lastCompleteIndex + 1);
      const unprocessedTokens = tokens.slice(lastCompleteIndex + 1);

      const newBlocks: string[] = [];

      for (const token of finishedTokens) {
        const raw = getRawText(token);
        const blockInCache = cacheRef.current.get(raw);
        if (blockInCache) {
          newBlocks.push(blockInCache);
        } else {
          const html = marked.parser([token]);
          const clean = DOMPurify.sanitize(html);
          cacheRef.current.set(raw, clean);
          newBlocks.push(clean);
        }
      }

      const lastRaw = unprocessedTokens.map(getRawText).join('\n');
      setBlocks(newBlocks);
      setTypingText(lastRaw);
    }, delay);

    return (): void => clearTimeout(handler);
  }, [markdownText, delay, getRawText]);

  const htmlBlocks = useMemo<ReactNode>(() => {
    return (
      <div
        className={classes.md_container}
        dangerouslySetInnerHTML={{ __html: blocks.join('') }}
      />
    );
  }, [blocks]);

  return {
    htmlBlocks,
    lastTypingText: typingText,
  };
}
