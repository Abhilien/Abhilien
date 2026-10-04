import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon, Logo } from '../components/Icon';
import { Avatar } from '../components/Portrait';
import { KindMark, PlanTag } from '../components/ui';
import { PERSONAS } from '../domain/seed';
import { useStore } from '../state/context';

const STEPS = 4;

export function WelcomeScreen() {
  const [step, setStep] = useState(0);
  const { state, act } = useStore();
  const nav = useNavigate();
  const [persona, setPersona] = useState(state.viewerId);

  const finish = () => {
    act((s) => ({ ...s, viewerId: persona, onboarded: true }));
    nav('/');
  };

  return (
    <div className="welcome" key={step}>
      <div className="row between">
        <div className="progress-dots" aria-label={`Step ${step + 1} of ${STEPS}`}>
          {Array.from({ length: STEPS }, (_, i) => (
            <span key={i} className={i < step ? 'done' : i === step ? 'current' : ''} />
          ))}
        </div>
        {step < STEPS - 1 && (
          <button className="btn quiet sm" onClick={() => setStep(STEPS - 1)}>
            Skip
          </button>
        )}
      </div>

      {step === 0 && (
        <div className="fade-in" style={{ marginTop: 56 }}>
          <div className="brand" style={{ fontSize: 30 }}>
            <Logo size={34} /> ekam
          </div>
          <h1 className="display lg" style={{ marginTop: 36 }}>
            You don’t need a thousand matches.
          </h1>
          <p className="muted" style={{ fontSize: 17, marginTop: 16, maxWidth: '32ch' }}>
            You need enough choice to find someone — and enough restraint to actually get to know them.
          </p>
          <p className="eyebrow" style={{ marginTop: 32 }}>Less choice · More connection</p>
        </div>
      )}

      {step === 1 && (
        <div className="fade-in">
          <h1 className="display" style={{ marginTop: 28 }}>
            How ekam works
          </h1>
          <div className="model-diagram">
            <Step n="1" title="Like many people">
              Each day you get a small, explained selection. Express interest in as many as you like.
            </Step>
            <Step n="2" title="Mutual interest waits">
              When it’s mutual, they join your waiting list. No conversation opens automatically.
            </Step>
            <Step n="3" title="Give your attention to one">
              One <b>Primary</b> romantic connection, and one Primary friendship. That’s where you talk, call and meet.
            </Step>
            <Step n="4" title="Stay discoverable">
              Dating someone doesn’t hide you. New mutual interest simply waits — no pressure, no parallel dating.
            </Step>
            <Step n="5" title="Change with care">
              Before choosing someone new, decide about your Primary: continue, move to friendship, pause or close.
            </Step>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="fade-in">
          <h1 className="display" style={{ marginTop: 28 }}>
            Your attention, <em>at a glance</em>
          </h1>
          <div className="stack" style={{ marginTop: 24, '--gap': '10px' } as React.CSSProperties}>
            <SlotDiagram kind="romantic" name="Ananya" waiting={['Priya', 'Riya', 'Sarah', 'Neha']} />
            <SlotDiagram kind="friendship" name="Rahul" waiting={['Kabir', 'Tara', 'Ishaan']} />
          </div>
          <div className="card tint" style={{ marginTop: 18 }}>
            <p className="h3">Premium is reach and insight — never more people</p>
            <p className="small muted" style={{ marginTop: 6 }}>
              Discover people farther away, see verified history and privacy controls. Everyone, Premium or not, has
              one Primary.
            </p>
          </div>
          <div className="card tint" style={{ marginTop: 10 }}>
            <div className="recip" style={{ justifyContent: 'flex-start', fontSize: 20 }}>
              See feedback <span className="arrow">⟷</span> Share feedback
            </div>
            <p className="small muted" style={{ marginTop: 6 }}>
              After a connection ends, both people can share how it felt. To see anyone’s Connection Feedback, yours
              must be visible too.
            </p>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="fade-in">
          <h1 className="display" style={{ marginTop: 28 }}>
            Explore as…
          </h1>
          <p className="muted" style={{ marginTop: 8 }}>
            A sample community of fictional members. You can switch at any time.
          </p>
          <div style={{ marginTop: 20 }} role="radiogroup" aria-label="Choose a persona">
            {PERSONAS.map((id) => {
              const u = state.users[id];
              return (
                <button key={id} className="persona" aria-pressed={persona === id} onClick={() => setPersona(id)}>
                  <Avatar p={u.profile.portraits[0]} size={52} />
                  <div className="grow">
                    <div className="row" style={{ '--gap': '8px' } as React.CSSProperties}>
                      <strong style={{ fontSize: 16 }}>
                        {u.profile.firstName}, {u.profile.age}
                      </strong>
                      <PlanTag plan={u.plan} />
                    </div>
                    <div className="small muted">{u.profile.place.city} · {u.persona?.tagline}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="foot">
        {step < STEPS - 1 ? (
          <button className="btn primary block" onClick={() => setStep(step + 1)}>
            {step === 0 ? 'How it works' : 'Continue'} <Icon name="arrowRight" size={18} />
          </button>
        ) : (
          <button className="btn primary block" onClick={finish}>
            Enter ekam
          </button>
        )}
      </div>
    </div>
  );
}

function Step({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <div className="model-step">
      <span className="n">{n}</span>
      <div>
        <p className="h3">{title}</p>
        <p className="small muted" style={{ marginTop: 2 }}>{children}</p>
      </div>
    </div>
  );
}

function SlotDiagram({ kind, name, waiting }: { kind: 'romantic' | 'friendship'; name: string; waiting: string[] }) {
  const tone = kind === 'romantic' ? 'romance' : 'friend';
  return (
    <div className={`card ${tone}`} style={{ padding: 16 }}>
      <div className="row between">
        <span className={`kind-label ${kind}`}>
          <KindMark kind={kind} size={13} /> {kind === 'romantic' ? 'Romantic' : 'Friendship'}
        </span>
        <span className="tiny muted">1 Primary · {waiting.length} waiting</span>
      </div>
      <div className="row" style={{ marginTop: 12 }}>
        <div className="chip" style={{ background: 'var(--surface)', color: 'var(--ink)', fontWeight: 600 }}>
          Primary · {name}
        </div>
        <div className="grow tiny muted" style={{ textAlign: 'right' }}>
          Waiting: {waiting.join(', ')}
        </div>
      </div>
    </div>
  );
}
