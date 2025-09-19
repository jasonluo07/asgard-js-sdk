interface TestComponentProps {
  message: string;
}

export default function TestComponent({ message }: TestComponentProps) {
  return (
    <div className="p-4 bg-blue-100 dark:bg-blue-900 rounded-lg">
      <h2 className="text-lg font-semibold text-blue-800 dark:text-blue-200">
        Test Component
      </h2>
      <p className="text-blue-600 dark:text-blue-300">{message}</p>
    </div>
  );
}
