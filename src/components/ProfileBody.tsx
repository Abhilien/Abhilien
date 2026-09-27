import { useState } from 'react';
import { compatibility, distance } from '../domain/discovery';
import { FIELD_LABEL, INTENT_LABEL, SHARE_LABEL } from '../domain/labels';
import { broadLocation, canSeeField } from '../domain/privacy';
import type { Kind, SharedField, User } from '../domain/types';
import { useStore } from '../state/store';
import { Icon } from './Icon';
import { PortraitArt } from './Portrait';
import { TrustSummary } from './Trust';

export function PhotoHero({ user, children }: { user: User; children?: React.ReactNode }) {
  const [i, setI] = useState(0);
  const n = user.profile.portraits.length;
  return (
    <div className="hero-photo">
      <div className="portrait">
        <PortraitArt p={user.profile.portraits[i]} label={`Photo ${i + 1} of ${n} of ${user.profile.firstName}`} />
      </div>
      <div className="photo-dots" aria-hidden="true">
        {user.profile.portraits.map((_, k) => (
          <span key={k} className={k === i ? 'on' : ''} />
        ))}
      </div>
      <div className="photo-nav">
        <button aria-label="Previous photo" onClick={() => setI((i - 1 + n) % n)} />
        <button aria-label="Next photo" onClick={() => setI((i + 1) % n)} />
      </div>
      {children}
    </div>
  );
}

export function HeroCaption({ user }: { user: User }) {
  const { viewer } = useStore();
  const p = user.profile;
  return (
    <div className="hero-caption">
      <h2 className="display">
        {p.firstName}, {p.age}
      </h2>
      <div className="meta">
        {broadLocation(p.place, viewer.profile.place.country)} · {p.profession}
      </div>
    </div>
  );
}

export function WhyThisPerson({ user, kind }: { user: User; kind: Kind }) {
  const { viewer } = useStore();
  const c = compatibility(viewer, user, kind);
  return (
    <div className="why">
      <div className="row between">
        <p className="h3">Why you’re seeing {user.profile.firstName}</p>
        <span className="chip accent">{c.label}</span>
      </div>
      <ul>
        {c.reasons.slice(0, 5).map((r) => (
          <li key={r}>
            <span className="mark"><Icon name="check" size={16} weight={2} /></span>
            {r}
          </li>
        ))}
        {c.differences.slice(0, 2).map((d) => (
          <li key={d} className="diff">
            <span className="mark">△</span>
            <span><span className="faint">Potential difference · </span>{d}</span>
          </li>
        ))}
      </ul>
      <p className="tiny faint" style={{ marginTop: 10 }}>
        Based on what you’ve both shared. Compatibility is decision support, not destiny.
      </p>
    </div>
  );
}

function Hidden({ field, user }: { field: SharedField; user: User }) {
  return (
    <div className="notice-bar">
      <Icon name="lock" size={16} />
      <span>
        {user.profile.firstName} shares {FIELD_LABEL[field].toLowerCase()} with{' '}
        {SHARE_LABEL[user.settings.sharing[field]].toLowerCase()}.
      </span>
    </div>
  );
}

export function ProfileBody({ user, kind }: { user: User; kind: Kind }) {
  const { state, viewer } = useStore();
  const p = user.profile;
  const see = (f: SharedField) => canSeeField(state, viewer.id, user.id, f);
  const dist = distance(viewer, user);
  const future = Object.entries({
    'Marriage timeline': p.future.marriageTimeline,
    Children: p.future.children,
    Location: p.future.relocation,
    Career: p.future.career,
    Family: p.future.family,
    Finances: p.future.finances,
  }).filter(([, v]) => v);

  return (
    <div className="stack" style={{ '--gap': '26px' } as React.CSSProperties}>
      <section>
        <p className="eyebrow" style={{ marginBottom: 6 }}>Looking for</p>
        <p className="display sm">
          {INTENT_LABEL[p.intent]}
          {p.intentNext && (
            <>
              {' '}
              <span className="faint">→</span> {INTENT_LABEL[p.intentNext]}
            </>
          )}
        </p>
        <div className="chips" style={{ marginTop: 10 }}>
          {p.openTo.map((k) => (
            <span key={k} className={`chip ${k === 'romantic' ? 'romance' : 'friend'}`}>
              Open to {k === 'romantic' ? 'dating' : 'friendship'}
            </span>
          ))}
          {dist !== 'local' && <span className="chip outline">{dist === 'international' ? 'Long-distance · abroad' : 'Long-distance'}</span>}
          {user.settings.relocation && <span className="chip outline">Open to relocation</span>}
        </div>
      </section>

      <section>
        <p className="eyebrow" style={{ marginBottom: 8 }}>About</p>
        <p style={{ fontSize: 16, lineHeight: 1.55 }}>{p.bio}</p>
      </section>

      {p.prompt && (
        <section className="card tint">
          <p className="eyebrow">{p.prompt.q}</p>
          <p className="display sm" style={{ marginTop: 8, fontSize: 23, lineHeight: 1.25 }}>{p.prompt.a}</p>
        </section>
      )}

      {viewer.id !== user.id && <WhyThisPerson user={user} kind={kind} />}

      <section>
        <p className="eyebrow" style={{ marginBottom: 10 }}>Lifestyle &amp; interests</p>
        <div className="chips">
          {[...p.lifestyle, ...p.interests].map((x) => (
            <span key={x} className="chip">{x}</span>
          ))}
        </div>
      </section>

      <section>
        <p className="eyebrow" style={{ marginBottom: 10 }}>What matters to me</p>
        <div className="chips">
          {p.values.map((x) => (
            <span key={x} className="chip outline">{x}</span>
          ))}
        </div>
      </section>

      <section>
        <p className="eyebrow" style={{ marginBottom: 10 }}>Work &amp; education</p>
        {see('profession') ? (
          <dl className="facts">
            <div><dt>Profession</dt><dd>{p.profession}</dd></div>
            <div><dt>Education</dt><dd>{see('education') ? p.education ?? '—' : 'Shared later'}</dd></div>
          </dl>
        ) : (
          <Hidden field="profession" user={user} />
        )}
      </section>

      {kind === 'romantic' && future.length > 0 && (
        <section>
          <p className="eyebrow" style={{ marginBottom: 10 }}>Future</p>
          {see('future') ? (
            <dl className="facts">
              {future.map(([k, v]) => (
                <div key={k}>
                  <dt>{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <Hidden field="future" user={user} />
          )}
        </section>
      )}

      <section>
        <p className="eyebrow" style={{ marginBottom: 10 }}>Languages</p>
        {see('languages') ? <p>{p.languages.join(' · ')}</p> : <Hidden field="languages" user={user} />}
      </section>

      {viewer.id !== user.id && <TrustSummary user={user} />}
    </div>
  );
}
