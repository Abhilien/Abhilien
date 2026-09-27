import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { Empty, TopBar } from '../components/ui';
import { bothReadyToMeet, other, reachStage, setDatePlan } from '../domain/rules';
import { useStore } from '../state/store';

const BUDGETS = ['₹', '₹₹', '₹₹₹'];
const TIMES = ['Weekday evening', 'Saturday afternoon', 'Sunday morning'];
const ACTIVITIES = ['Coffee', 'A walk', 'Dinner', 'Museum or gallery', 'Live music'];

// Curated suggestions; a live product would draw on partner venues.
const VENUES: Record<string, string[]> = {
  Coffee: ['Blue Tokai, a quiet corner table', 'Perch Wine & Coffee Bar'],
  'A walk': ['Lodhi Garden, near the Bara Gumbad', 'Sunder Nursery, main lawns'],
  Dinner: ['Indian Accent (for a special evening)', 'Diva Kitchen & Bar'],
  'Museum or gallery': ['Kiran Nadar Museum of Art', 'National Gallery of Modern Art'],
  'Live music': ['The Piano Man Jazz Club', 'Depot48'],
};

export function DatePlanScreen() {
  const { id = '' } = useParams();
  const { state, viewer, act, toast } = useStore();
  const nav = useNavigate();
  const conn = state.connections.find((c) => c.id === id);
  const [activity, setActivity] = useState('Coffee');
  const [budget, setBudget] = useState('₹₹');
  const [time, setTime] = useState(TIMES[1]);
  const [venue, setVenue] = useState(0);

  if (!conn || !bothReadyToMeet(conn)) {
    return (
      <>
        <TopBar back />
        <Empty title="Not yet">Date planning opens when you’re both comfortable meeting.</Empty>
      </>
    );
  }
  const them = state.users[other(conn, viewer.id)];
  const area = viewer.profile.place.metro === them.profile.place.metro ? viewer.profile.place.metro : `${them.profile.place.city} or ${viewer.profile.place.city}`;
  const sharedInterests = viewer.profile.interests.filter((i) => them.profile.interests.includes(i));
  const options = VENUES[activity];

  return (
    <>
      <TopBar back title="Plan a date" />
      <div className="scroll">
        <p className="eyebrow">You’re both interested in meeting</p>
        <h1 className="display sm" style={{ margin: '6px 0 4px' }}>Something easy with {them.profile.firstName}</h1>
        <p className="small muted">
          Optional. Suggestions are based on {area}
          {sharedInterests.length ? ` and your shared love of ${sharedInterests[0].toLowerCase()}` : ''}.
        </p>

        <section className="section">
          <p className="eyebrow" style={{ marginBottom: 8 }}>What feels right</p>
          <div className="chips">
            {ACTIVITIES.map((a) => (
              <button key={a} className="chip" aria-pressed={activity === a} onClick={() => { setActivity(a); setVenue(0); }}>{a}</button>
            ))}
          </div>
        </section>
        <section className="section">
          <p className="eyebrow" style={{ marginBottom: 8 }}>When</p>
          <div className="chips">
            {TIMES.map((t) => (
              <button key={t} className="chip" aria-pressed={time === t} onClick={() => setTime(t)}>{t}</button>
            ))}
          </div>
        </section>
        <section className="section">
          <p className="eyebrow" style={{ marginBottom: 8 }}>Budget</p>
          <div className="chips">
            {BUDGETS.map((b) => (
              <button key={b} className="chip" aria-pressed={budget === b} onClick={() => setBudget(b)}>{b}</button>
            ))}
          </div>
        </section>
        <section className="section">
          <p className="eyebrow" style={{ marginBottom: 8 }}>Suggestions</p>
          <div role="radiogroup">
            {options.map((v, i) => (
              <button key={v} className="option" role="radio" aria-checked={venue === i} onClick={() => setVenue(i)}>
                <span className="glyph"><Icon name="calendar" size={16} /></span>
                <div>
                  <div style={{ fontWeight: 600 }}>{v}</div>
                  <div className="tiny muted">Public, easy to reach, easy to leave</div>
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className="section card tint">
          <div className="row" style={{ '--gap': '8px' } as React.CSSProperties}>
            <Icon name="shield" size={18} />
            <p className="h3">Meeting safely</p>
          </div>
          <ul className="small muted" style={{ margin: '8px 0 0', paddingLeft: 18 }}>
            <li>Meet somewhere public for the first few dates.</li>
            <li>Arrange your own travel, and tell a friend where you’ll be.</li>
            <li>Keep conversations in ekam until you’re comfortable sharing your number.</li>
            <li>You can leave at any time. You never owe anyone more time than feels right.</li>
          </ul>
        </section>

        <button
          className="btn primary block"
          style={{ marginTop: 22 }}
          onClick={() => {
            act((s) => reachStage(setDatePlan(s, conn.id, viewer.id, { area, budget, time, activity, venue: options[venue] }), conn.id, 'meeting'));
            toast(`Shared with ${them.profile.firstName}.`);
            nav(`/chat/${conn.id}`);
          }}
        >
          Share this plan with {them.profile.firstName}
        </button>
      </div>
    </>
  );
}
