import { Route, Routes } from 'react-router-dom';
import { ReactNode } from 'react';
import { Root } from '../pages/root';
import '../../../../packages/react/dist/style.css';

export default function App(): ReactNode {
  return (
    <Routes>
      <Route path="/" element={<Root />} />
    </Routes>
  );
}
