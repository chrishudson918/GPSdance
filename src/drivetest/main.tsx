import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import DriveTestApp from './DriveTestApp';
import '../styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <DriveTestApp />
  </StrictMode>,
);
