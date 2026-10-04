// YOU: settings, "What I've learned" (observations, never diagnosis), and
// full control of your data.

import { useState } from 'react';
import { lateCorrection } from '../core/leave';
import { actions, useStore } from '../state/store';

export function You({ toast }: { toast: (m: string) => void }) {
  const settings = useStore((s) => s.settings);
  const lags = useStore((s) => s.lags);
  const ledger = useStore((s) => s.ledger);
  const lc = lateCorrection(lags);
  const notifSupported = typeof Notification !== 'undefined';
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div className="stack">
      <section className="card" aria-labelledby="learned">
        <p className="eyebrow" id="learned">
          What I’ve learned
        </p>
        <p className="note" style={{ marginTop: 0 }}>
          Only on this device. Observations, never diagnoses.
        </p>
        {lc.n === 0 ? (
          <p className="meta">Nothing yet. After a few appointments I’ll learn how long you really take to get out the door.</p>
        ) : (
          <>
            <p style={{ margin: '8px 0 0' }}>
              ⏱ You usually leave about <strong>{lc.medianMin} min</strong> after the plan ({lc.n} observation{lc.n === 1 ? '' : 's'}).
            </p>
            <p className="meta">
              {lc.correctionMin > 0 ? `I add ${lc.correctionMin} min to your leave times.` : 'I need at least 3 observations before adjusting anything.'}
            </p>
            <div className="row" style={{ marginTop: 8 }}>
              <button
                className="btn"
                onClick={() => {
                  actions.forgetLateness();
                  toast('Forgotten.');
                }}
              >
                Forget this
              </button>
            </div>
          </>
        )}
        <div className="settings-row">
          <span>Learn from my patterns</span>
          <input type="checkbox" checked={settings.learning} onChange={(e) => actions.updateSettings({ learning: e.target.checked })} aria-label="Learn from my patterns" />
        </div>
      </section>

      <section className="card" aria-labelledby="notifs">
        <p className="eyebrow" id="notifs">
          Interruptions
        </p>
        <div className="settings-row">
          <label htmlFor="budget">Max interruptions per day</label>
          <select id="budget" value={settings.budget} onChange={(e) => actions.updateSettings({ budget: Number(e.target.value) })}>
            {[3, 4, 6, 8, 12].map((n) => (
              <option key={n}>{n}</option>
            ))}
          </select>
        </div>
        <p className="note">
          Used today: {ledger.used}. Anything beyond the limit waits quietly in a digest on the home screen.
        </p>
        <div className="settings-row">
          <span>Quiet hours</span>
          <span className="row">
            <input type="time" aria-label="Quiet hours start" value={settings.quietStart} onChange={(e) => actions.updateSettings({ quietStart: e.target.value })} />
            –
            <input type="time" aria-label="Quiet hours end" value={settings.quietEnd} onChange={(e) => actions.updateSettings({ quietEnd: e.target.value })} />
          </span>
        </div>
        {notifSupported && (
          <div className="settings-row">
            <span>System notifications when this tab is in the background</span>
            <input
              type="checkbox"
              aria-label="System notifications"
              checked={settings.systemNotifications}
              onChange={async (e) => {
                if (e.target.checked && Notification.permission !== 'granted') {
                  const res = await Notification.requestPermission();
                  if (res !== 'granted') {
                    toast('Notifications are blocked in this browser.');
                    return;
                  }
                }
                actions.updateSettings({ systemNotifications: e.target.checked });
              }}
            />
          </div>
        )}
      </section>

      <section className="card" aria-labelledby="data">
        <p className="eyebrow" id="data">
          Your data
        </p>
        <p className="meta" style={{ marginTop: 0 }}>
          Everything is stored in this browser only. No account, no server, no analytics.
        </p>
        <div className="row" style={{ marginTop: 10 }}>
          <button
            className="btn"
            onClick={() => {
              const blob = new Blob([actions.exportJSON()], { type: 'application/json' });
              const a = document.createElement('a');
              a.href = URL.createObjectURL(blob);
              a.download = `waypoint-export-${new Date().toISOString().slice(0, 10)}.json`;
              a.click();
              URL.revokeObjectURL(a.href);
            }}
          >
            Export
          </button>
          <button className="btn" onClick={() => actions.loadDemo(new Date())}>
            Load demo day
          </button>
          <button
            className="btn"
            onClick={() => {
              if (!confirmDelete) {
                setConfirmDelete(true);
                return;
              }
              actions.deleteEverything(new Date());
              setConfirmDelete(false);
              toast('Everything deleted.');
            }}
            onBlur={() => setConfirmDelete(false)}
          >
            {confirmDelete ? 'Tap again to delete everything' : 'Delete everything'}
          </button>
        </div>
      </section>

      <section className="card">
        <p className="eyebrow">About</p>
        <p style={{ marginTop: 0 }}>
          Waypoint is a planning and reminder tool designed around ADHD research. It doesn’t diagnose or treat anything and isn’t a substitute for
          professional care.
        </p>
        <p className="note">Shortcut: press / anywhere to capture.</p>
      </section>
    </div>
  );
}
