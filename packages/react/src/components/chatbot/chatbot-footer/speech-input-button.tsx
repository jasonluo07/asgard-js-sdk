import {
  Dispatch,
  MouseEventHandler,
  ReactNode,
  SetStateAction,
  TouchEventHandler,
  useCallback,
  useEffect,
  useRef,
  useState,
  CSSProperties,
} from 'react';
import MicSvg from 'src/icons/mic.svg?react';
import StopSvg from 'src/icons/stop.svg?react';

interface SpeechInputButtonProps {
  setValue: Dispatch<SetStateAction<string>>;
  className?: string;
  style?: CSSProperties;
}

export function SpeechInputButton(props: SpeechInputButtonProps): ReactNode {
  const { setValue, className, style } = props;

  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.lang = 'zh-TW';
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event: SpeechRecognitionEvent): void => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          setValue((prev) => prev + event.results[i][0].transcript);
        }
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent): void => {
      alert(`語音識別錯誤: ${JSON.stringify(event.error)}`);
    };

    recognition.onend = (): void => {
      setListening(false);
    };

    recognitionRef.current = recognition;
  }, [setValue]);

  const startListening = useCallback(() => {
    if (!recognitionRef.current) {
      alert('無法開始辨識: 語音識別器未初始化，請檢查是否有授權使用麥克風');

      return;
    }

    try {
      recognitionRef.current.start();
      setListening(true);
    } catch (error) {
      alert(`無法開始辨識: ${JSON.stringify(error)}`);
    }
  }, []);

  const stopListening = useCallback(() => {
    if (!recognitionRef.current) return;

    recognitionRef.current.stop();
    setListening(false);
  }, []);

  const onMouseDown = useCallback<MouseEventHandler<HTMLDivElement>>(
    (event) => {
      if (!listening) {
        event.preventDefault();
        startListening();
      }
    },
    [listening, startListening]
  );

  const onMouseUp = useCallback<MouseEventHandler<HTMLDivElement>>(
    (event) => {
      if (listening) {
        event.preventDefault();
        stopListening();
      }
    },
    [listening, stopListening]
  );

  const onTouchStart = useCallback<TouchEventHandler<HTMLDivElement>>(
    (event) => {
      if (!listening) {
        event.preventDefault();
        startListening();
      }
    },
    [listening, startListening]
  );

  const onTouchEnd = useCallback<TouchEventHandler<HTMLDivElement>>(
    (event) => {
      if (listening) {
        event.preventDefault();
        stopListening();
      }
    },
    [listening, stopListening]
  );

  return (
    <div
      className={className}
      style={style}
      onMouseDown={onMouseDown}
      onMouseUp={onMouseUp}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {listening ? <StopSvg /> : <MicSvg />}
    </div>
  );
}
