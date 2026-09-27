import { Icon, type IconName } from '../components/Icon';
import { TopBar } from '../components/ui';
import { setPlan } from '../domain/rules';
import { useStore } from '../state/store';

const PILLARS: { icon: IconName; title: string; items: string[] }[] = [
  { icon: 'globe', title: 'More reach', items: ['National, international and global discovery', 'Choose the countries you’re open to', 'Advanced filters'] },
  { icon: 'info', title: 'More information', items: ['Platform history and interaction patterns', 'Profile history: photo, location and intent changes', 'Connection Feedback — when yours is visible too'] },
  { icon: 'eye', title: 'More control', items: ['Incognito browsing', 'Anonymous discovery', 'Progressive sharing, detail by detail', 'Feedback visibility on or off'] },
  { icon: 'shield', title: 'More verification', items: ['Employment verification', 'Education verification'] },
];

const NEVER = [
  'More than one romantic Primary',
  'Unlimited swiping or matches',
  'Boosts, spotlights or ranking higher',
  'Seeing feedback while hiding your own',
  'Seeing who passed on you',
];

const COMPARE: [string, string, string][] = [
  ['Romantic Primary', '1', '1'],
  ['Friendship Primary', '1', '1'],
  ['Waiting lists', '✓', '✓'],
  ['Daily recommendations', '5', '5'],
  ['Discovery reach', 'Local · Regional', 'Up to Global'],
  ['Platform history', '—', '✓'],
  ['View Connection Feedback', '—', 'When yours is visible'],
  ['Hide your feedback', '—', '✓ (then you can’t view others’)'],
  ['Incognito & anonymous discovery', '—', '✓'],
];

export function PremiumScreen() {
  const { viewer, act, toast } = useStore();
  const premium = viewer.plan !== 'free';
  return (
    <>
      <TopBar back title="Premium" />
      <div className="scroll">
        <p className="eyebrow">ekam Premium</p>
        <h1 className="display" style={{ margin: '8px 0 10px' }}>
          Free helps you meet people. <em>Premium helps you decide well.</em>
        </h1>
        <p className="muted">Greater reach, transparency, privacy and verification. Never more people at once.</p>

        <section className="section stack">
          {PILLARS.map((p) => (
            <div key={p.title} className="card flat">
              <div className="row" style={{ '--gap': '10px' } as React.CSSProperties}>
                <Icon name={p.icon} />
                <p className="h3">{p.title}</p>
              </div>
              <ul className="small muted" style={{ margin: '8px 0 0', paddingLeft: 30 }}>
                {p.items.map((i) => <li key={i}>{i}</li>)}
              </ul>
            </div>
          ))}
        </section>

        <section className="section card tint">
          <p className="h3">What Premium never does</p>
          <ul style={{ listStyle: 'none', padding: 0, margin: '10px 0 0' }}>
            {NEVER.map((n) => (
              <li key={n} className="row small" style={{ '--gap': '10px', padding: '3px 0' } as React.CSSProperties}>
                <Icon name="x" size={14} className="faint" /> {n}
              </li>
            ))}
          </ul>
        </section>

        <section className="section">
          <p className="eyebrow" style={{ marginBottom: 10 }}>Compare</p>
          <div className="list">
            <div className="list-row small" style={{ fontWeight: 600 }}>
              <span className="grow" />
              <span style={{ width: 84, textAlign: 'center' }}>Free</span>
              <span style={{ width: 110, textAlign: 'center' }}>Premium</span>
            </div>
            {COMPARE.map(([k, f, p]) => (
              <div key={k} className="list-row small">
                <span className="grow">{k}</span>
                <span style={{ width: 84, textAlign: 'center' }} className="muted">{f}</span>
                <span style={{ width: 110, textAlign: 'center' }}>{p}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="section" style={{ textAlign: 'center' }}>
          <p className="display sm">₹1,299 <span className="small muted" style={{ fontFamily: 'var(--sans)' }}>/ month · illustrative</span></p>
          <button
            className={`btn block ${premium ? 'secondary' : 'primary'}`}
            style={{ marginTop: 14 }}
            onClick={() => {
              act((s) => setPlan(s, viewer.id, premium ? 'free' : 'premium'));
              toast(premium ? 'Switched to Free (demo). Your feedback is visible again.' : 'Premium is on (demo).');
            }}
          >
            {premium ? 'Switch to Free (demo)' : 'Try Premium (demo)'}
          </button>
          <p className="tiny faint" style={{ marginTop: 8 }}>No payment in this prototype.</p>
        </section>

        <section className="section card gold">
          <p className="eyebrow">Later</p>
          <p className="h3" style={{ marginTop: 6 }}>ekam Concierge</p>
          <p className="small muted" style={{ marginTop: 4 }}>
            A professional matchmaker for profile refinement, curated introductions and relationship guidance. Designed
            for, not yet available.
          </p>
        </section>
      </div>
    </>
  );
}
