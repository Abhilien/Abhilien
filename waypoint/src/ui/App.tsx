import { useCallback, useEffect, useRef, useState } from 'react';
import { HOUR, formatTime, toDateKey, atTime } from '../core/dates';
import { nextStep, stepsFor } from '../core/microsteps';
import type { ParseResult, ParsedItem } from '../core/parser';
import type { Item, Park, Size } from '../core/types';
import { actions, getState, newId, useStore } from '../state/store';
import { CaptureBar, ConfirmSheet } from './Capture';
import { CueToasts } from './Cues';
import { useNow } from './hooks';
import { Later } from './Later';
import { AddEventSheet, Now } from './Now';
import { Overwhelm, ResetDay } from './Recover';
import { ParkSheet, StartFlow } from './StartFlow';
import { You } from './You';

type Tab = 'now' | 'later' | 'you';

interface StartState {
  item: Item | null;
  title: string;
  size: Size | null;
  fixedStep?: string;
  sessionId?: string;
}

interface ParkState {
  itemId: string | null;
  title: string;
  suggested: string;
}

const TICK_MS = 15_000;

export function App() {
  const now = useNow(1000);
  const [tab, setTab] = useState<Tab>('now');
  const [capture, setCapture] = useState<ParseResult | null>(null);
  const [start, setStart] = useState<StartState | null>(null);
  const [park, setPark] = useState<ParkState | null>(null);
  const [overwhelm, setOverwhelm] = useState(false);
  const [resetDay, setResetDay] = useState(false);
  const [addEvent, setAddEvent] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const toast = useCallback((msg: string) => {
    setNotice(msg);
    clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(null), 3500);
  }, []);

  // Open: fresh start + self-cleaning. Then the cue scheduler.
  useEffect(() => {
    actions.open(new Date());
    actions.tick(new Date());
    const id = setInterval(() => actions.tick(new Date()), TICK_MS);
    const onVisible = () => document.visibilityState === 'visible' && actions.tick(new Date());
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  // Mirror new cues to system notifications when the tab is in the background.
  const inbox = useStore((s) => s.inbox);
  const seen = useRef(new Set<string>());
  useEffect(() => {
    const { settings } = getState();
    for (const m of inbox) {
      const key = `${m.itemId}:${m.step}`;
      if (seen.current.has(key)) continue;
      seen.current.add(key);
      if (settings.systemNotifications && m.tier !== 'digest' && document.hidden && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        new Notification(m.title, { body: m.body, tag: m.itemId });
      }
    }
  }, [inbox]);

  const openStart = useCallback((item: Item | null, title: string, size: Size | null, fixedStep?: string) => {
    setStart({ item, title, size, fixedStep });
  }, []);

  const resume = useCallback(
    (p: Park) => {
      actions.resume(p.id, new Date());
      if (p.link) window.open(p.link, '_blank', 'noopener');
      openStart(p.itemId ? (getState().items.find((i) => i.id === p.itemId) ?? null) : null, p.title, 'fine', p.nextAction);
    },
    [openStart],
  );

  const onParsed = useCallback((result: ParseResult) => setCapture(result), []);

  const confirmCapture = (items: ParsedItem[]) => {
    actions.addParsed(items, new Date());
    actions.tick(new Date());
    setCapture(null);
    toast(items.length === 1 ? 'Got it.' : `Got ${items.length} things. Out of your head.`);
  };

  const enterOverwhelm = () => {
    actions.setOverwhelm(Date.now() + HOUR);
    setCapture(null);
    setOverwhelm(true);
  };

  return (
    <div className="app">
      <header className="top">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            ◆
          </span>
          Waypoint
        </div>
        <span className="clock">
          {now.toLocaleDateString([], { weekday: 'short' })} {formatTime(now.getTime())}
        </span>
      </header>

      <nav className="tabs" role="tablist" aria-label="Sections">
        {(['now', 'later', 'you'] as const).map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)}>
            {t === 'now' ? 'Now' : t === 'later' ? 'Later' : 'You'}
          </button>
        ))}
      </nav>

      <main>
        <CueToasts onStart={(item, size) => openStart(item, item.title, size)} toast={toast} />
        {tab === 'now' && (
          <>
            <DayStrip now={now} />
            <Now
              now={now}
              onStart={(item, title, size) => openStart(item, title, size)}
              onResume={resume}
              onAddEvent={() => setAddEvent(true)}
              onOverwhelm={enterOverwhelm}
              onResetDay={() => setResetDay(true)}
              toast={toast}
            />
          </>
        )}
        {tab === 'later' && <Later now={now} onStart={(item) => openStart(item, item.title, null)} onResume={resume} />}
        {tab === 'you' && <You toast={toast} />}
      </main>

      <CaptureBar onParsed={onParsed} />

      {notice && (
        <div className="toasts" role="status" aria-live="polite">
          <div className="toast notice">
            {notice}
          </div>
        </div>
      )}

      {capture && <ConfirmSheet result={capture} now={now} onConfirm={confirmCapture} onCancel={() => setCapture(null)} onOverwhelm={enterOverwhelm} />}

      {start && (
        <StartFlow
          key={`${start.title}-${start.fixedStep ?? ''}`}
          title={start.title}
          initialSize={start.size}
          fixedStep={start.fixedStep}
          onStarted={(size, minutes) => {
            const id = newId('ss');
            setStart((s) => (s ? { ...s, sessionId: id } : s));
            actions.startSession({ id, itemId: start.item?.id ?? null, title: start.title, size, plannedMin: minutes, startedAt: Date.now() });
          }}
          onDone={() => {
            if (start.sessionId) actions.endSession(start.sessionId, 'done', new Date());
            if (start.item) actions.complete(start.item.id, new Date());
            setStart(null);
            toast(getState().settings.celebrate ? 'Done. That counts. ✨' : 'Done.');
          }}
          onStopHere={(stepText) => {
            if (start.sessionId) actions.endSession(start.sessionId, 'stop_here', new Date());
            const steps = stepsFor(start.title);
            const idx = steps.indexOf(stepText);
            const suggested = start.fixedStep ?? (idx >= 0 ? (nextStep(start.title, idx)?.text ?? stepText) : stepText);
            setPark({ itemId: start.item?.id ?? null, title: start.title, suggested });
            setStart(null);
          }}
          onClose={() => setStart(null)}
        />
      )}

      {park && (
        <ParkSheet
          title={park.title}
          suggestedNext={park.suggested}
          onSave={(nextAction, where, link) => {
            actions.park({ itemId: park.itemId, title: park.title, nextAction, where: where || undefined, link: link || undefined }, new Date());
            setPark(null);
            toast('Saved your place. Stopping is allowed.');
          }}
          onCancel={() => setPark(null)}
        />
      )}

      {overwhelm && <Overwhelm onStart={(item) => openStart(item, item.title, 'cant')} onClose={() => setOverwhelm(false)} />}
      {resetDay && <ResetDay onStart={(item) => openStart(item, item.title, 'heavy')} onClose={() => setResetDay(false)} />}
      {addEvent && <AddEventSheet onClose={() => setAddEvent(false)} />}
    </div>
  );
}

/** A thin timeline from 6am to midnight: where "now" is, and what's next. */
function DayStrip({ now }: { now: Date }) {
  const events = useStore((s) => s.events);
  const items = useStore((s) => s.items);
  const key = toDateKey(now);
  const startMs = atTime(key, '06:00');
  const endMs = atTime(key, '23:59');
  const pos = (ms: number) => `${Math.max(0, Math.min(100, ((ms - startMs) / (endMs - startMs)) * 100))}%`;
  const marks = [
    ...events.filter((e) => toDateKey(new Date(e.startAt)) === key).map((e) => ({ at: e.startAt, label: `${formatTime(e.startAt)} ${e.title}` })),
    ...items
      .filter((i) => i.status === 'open' && i.due?.date === key && i.due.time)
      .map((i) => ({ at: atTime(key, i.due!.time!), label: formatTime(atTime(key, i.due!.time!)) })),
  ]
    .filter((m) => m.at > now.getTime())
    .sort((a, b) => a.at - b.at)
    .slice(0, 3);
  return (
    <div className="strip" aria-hidden="true">
      <div className="strip-line" />
      {marks.map((m) => (
        <span key={m.at + m.label} className="strip-mark" style={{ left: pos(m.at) }}>
          {m.label}
        </span>
      ))}
      <span className="strip-now" style={{ left: pos(now.getTime()) }} />
    </div>
  );
}
