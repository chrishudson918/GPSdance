// Long-show test: the speed tool (Signalsmith Stretch 1.3.2) as it runs on the audio thread, with our
// changes on top (stretchProcessor.ts): a processor meter, an "alive" switch, and fixes for two bugs
// that silence it when it's fed a piece at a time.
// Loaded with audioWorklet.addModule() (see liveStretch.ts), never imported by page code.
//
// How: the library registers its processor with registerProcessor() when this module loads, so we
// wrap registerProcessor first. Imports run in order, so './stretchProcessor' must stay first.

import './stretchProcessor';
import 'signalsmith-stretch';
