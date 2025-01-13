// Uncomment this line to use CSS modules
// import styles from './app.module.scss';

import { Route, Routes, Link } from 'react-router-dom';
import { MessageBox } from '@asgard-js/react';

const {
  VITE_BASE_URL,
  VITE_NAMESPACE,
  VITE_BOT_PROVIDER_NAME,
  VITE_WEBHOOK_TOKEN,
} = import.meta.env;

export function App() {
  return (
    <div>
      <MessageBox
        config={{
          baseUrl: VITE_BASE_URL,
          namespace: VITE_NAMESPACE,
          botProviderName: VITE_BOT_PROVIDER_NAME,
          webhookToken: VITE_WEBHOOK_TOKEN,
        }}
      />
      <div role="navigation">
        <ul>
          <li>
            <Link to="/">Home</Link>
          </li>
          <li>
            <Link to="/page-2">Page 2</Link>
          </li>
        </ul>
      </div>
      <Routes>
        <Route
          path="/"
          element={
            <div>
              This is the generated root route.{' '}
              <Link to="/page-2">Click here for page 2.</Link>
            </div>
          }
        />
        <Route
          path="/page-2"
          element={
            <div>
              <Link to="/">Click here to go back to root page.</Link>
            </div>
          }
        />
      </Routes>
    </div>
  );
}

export default App;
