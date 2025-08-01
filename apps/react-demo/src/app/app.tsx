import { Route, Routes } from 'react-router-dom';
import { ReactNode } from 'react';
import { Root } from '../pages/root';
import '@asgard-js/react/style';

export default function App(): ReactNode {
  return (
    <Routes>
      <Route path="/" element={<Root />} />
    </Routes>
  );
}
