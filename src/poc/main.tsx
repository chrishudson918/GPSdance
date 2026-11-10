import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import PocApp from './PocApp';
import '../styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PocApp />
  </StrictMode>,
);
