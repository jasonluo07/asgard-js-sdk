interface QuickQuestionButtonsProps {
  onQuestionClick: (question: string) => void;
}

export default function QuickQuestionButtons({ onQuestionClick }: QuickQuestionButtonsProps) {
  return (
    <div className="fixed bottom-20 right-4 flex flex-col gap-2">
      <button
        onClick={() => onQuestionClick('死侍有上映嗎？')}
        className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded-lg text-sm shadow-lg transition-colors"
      >
        死侍有上映嗎？
      </button>
      <button
        onClick={() => onQuestionClick('哪邊可以找得到哺乳室？')}
        className="bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded-lg text-sm shadow-lg transition-colors"
      >
        哪邊可以找得到哺乳室？
      </button>
    </div>
  );
}