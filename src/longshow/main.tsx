import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import LongShowApp from './LongShowApp';
import '../styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LongShowApp />
  </StrictMode>,
);
