import { Route, Routes } from 'react-router-dom';
import { ReactNode } from 'react';
import { Root } from '../pages/root';
import '../../../../packages/react/dist/style.css';
import { ScrollTest } from '../pages/scroll';

export default function App(): ReactNode {
  return (
    <Routes>
      <Route path="/" element={<Root />} />
      <Route path="/scroll" element={<ScrollTest />} />
    </Routes>
  );
}
