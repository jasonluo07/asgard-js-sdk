import { Route, Routes } from 'react-router-dom';
import { ReactNode } from 'react';
import { Root } from '../pages/root';
import '@asgard-js/react/style';
import { ScrollTest } from '../pages/scroll';

export default function App(): ReactNode {
  return (
    <Routes>
      <Route path="/" element={<Root />} />
      <Route path="/scroll" element={<ScrollTest />} />
    </Routes>
  );
}
