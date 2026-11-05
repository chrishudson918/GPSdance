import { useMemo, useState } from 'react';
import { formatResults, readDeviceInfo, runChecks, statusMark } from './deviceCheck';

const build = __BUILD_INFO__;
const buildDate = new Date(build.date).toLocaleDateString('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

/** Starter page: shows whether this computer can run the app. Replaced by the real app later. */
export default function App() {
  const results = useMemo(() => runChecks(readDeviceInfo()), []);
  const [copied, setCopied] = useState<'idle' | 'done' | 'failed'>('idle');

  async function copyResults() {
    const text = formatResults(results, build, new Date());
    try {
      await navigator.clipboard.writeText(text);
      setCopied('done');
    } catch {
      setCopied('failed');
    }
  }

  return (
    <main className="card">
      <header className="card-header">
        <div>
          <h1>GPSdance</h1>
          <p className="muted">(working name)</p>
        </div>
        <div className="build">
          <p>build {build.version}</p>
          <p className="muted">{buildDate}</p>
        </div>
      </header>

      <section>
        <h2>Will it work on this computer?</h2>
        <ul className="checks">
          {results.map((r) => (
            <li key={r.label} className={`check check-${r.status}`}>
              <span className="mark" aria-hidden="true">
                {statusMark(r.status)}
              </span>
              <span>
                {r.label}
                {r.detail && <span className="detail">: {r.detail}</span>}
              </span>
            </li>
          ))}
        </ul>

        <button type="button" onClick={copyResults}>
          Copy these results
        </button>
        <p className="copy-status" role="status">
          {copied === 'done' && 'Copied. Paste them into an email or chat.'}
          {copied === 'failed' && "Couldn't copy. Take a screenshot instead."}
        </p>
      </section>

      <footer className="muted small">Commit {build.commit}</footer>
    </main>
  );
}
