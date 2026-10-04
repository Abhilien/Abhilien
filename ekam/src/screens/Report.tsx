import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Empty, TopBar } from '../components/ui';
import { REPORT_LABEL } from '../domain/labels';
import { reportFeedback } from '../domain/rules';
import type { ReportReason } from '../domain/types';
import { useStore } from '../state/context';

export function ReportScreen() {
  const { id = '' } = useParams();
  const { state, viewer, act, toast } = useStore();
  const nav = useNavigate();
  const [reason, setReason] = useState<ReportReason | null>(null);
  const entry = state.feedback.find((f) => f.id === id);
  if (!entry || !entry.comment) return <><TopBar back /><Empty title="Not found" /></>;

  return (
    <>
      <TopBar back title="Report feedback" />
      <div className="scroll">
        <p className="quote" style={{ marginBottom: 18 }}>“{entry.comment}”</p>
        <p className="muted small" style={{ marginBottom: 14 }}>
          Reported comments are hidden while a person on our Trust &amp; Safety team reviews them. Feedback can’t be
          used as a weapon — and a report never labels anyone automatically.
        </p>
        <div role="radiogroup" aria-label="Reason">
          {(Object.keys(REPORT_LABEL) as ReportReason[]).map((r) => (
            <button key={r} className="option" role="radio" aria-checked={reason === r} onClick={() => setReason(r)}>
              {REPORT_LABEL[r]}
            </button>
          ))}
        </div>
        <button
          className="btn primary block"
          style={{ marginTop: 20 }}
          disabled={!reason}
          onClick={() => {
            act((s) => reportFeedback(s, id, viewer.id, reason!));
            toast('Thank you. The comment is hidden while we review it.');
            nav(-1);
          }}
        >
          Submit report
        </button>
      </div>
    </>
  );
}
