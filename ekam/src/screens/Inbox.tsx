import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { Empty, TopBar } from '../components/ui';
import { markNoticesRead } from '../domain/rules';
import { useStore } from '../state/context';

function when(iso: string, now: string) {
  const mins = Math.max(0, Math.round((new Date(now).getTime() - new Date(iso).getTime()) / 60000));
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  const h = Math.round(mins / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  return d === 1 ? 'Yesterday' : `${d} days ago`;
}

export function InboxScreen() {
  const { state, viewer, act } = useStore();
  const mine = state.notices.filter((n) => n.for === viewer.id);
  const unread = mine.filter((n) => !n.read).map((n) => n.id);

  // Mark as read after the screen has been seen.
  useEffect(() => {
    if (!unread.length) return;
    const t = setTimeout(() => act((s) => markNoticesRead(s, viewer.id)), 1200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unread.length, viewer.id]);

  return (
    <>
      <TopBar title={<span className="display sm" style={{ fontSize: 26 }}>Updates</span>} />
      <div className="scroll">
        <p className="small muted" style={{ marginBottom: 16 }}>
          Only things that matter: mutual interest, your connections, and your account. Never “someone liked you”.
        </p>
        {mine.length ? (
          <div className="list">
            {mine.map((n) => (
              <Link key={n.id} to={n.link ?? '/'} className="list-row">
                <span
                  aria-hidden="true"
                  style={{ width: 8, height: 8, borderRadius: 4, background: unread.includes(n.id) ? 'var(--romance)' : 'transparent', flexShrink: 0 }}
                />
                <div className="grow">
                  <div style={{ fontWeight: unread.includes(n.id) ? 600 : 450 }}>{n.text}</div>
                  <div className="tiny faint">{when(n.at, state.now)}</div>
                </div>
                <Icon name="next" size={16} className="faint" />
              </Link>
            ))}
          </div>
        ) : (
          <Empty icon={<Icon name="bell" size={28} className="faint" />} title="All quiet">
            We’ll only let you know when something meaningful happens.
          </Empty>
        )}
      </div>
    </>
  );
}
