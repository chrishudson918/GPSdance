import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import LongShowApp from './LongShowApp';
import { preferSampleRate } from '../poc/audio';
import '../styles.css';

// Most songs are 44.1 kHz; matching it spares Chrome a converted copy of each decoded song
// (one suspect for the 686 MB jump peak on the Dell 3120, 2026-11-18).
preferSampleRate(44100);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LongShowApp />
  </StrictMode>,
);
