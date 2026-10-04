// A shrinking time ring. Time is shown as remaining, not as a clock reading.

interface Props {
  /** 0–1 of the time remaining. */
  fraction: number;
  label: string;
  sub?: string;
  size?: number;
}

export function Ring({ fraction, label, sub, size = 112 }: Props) {
  const stroke = 10;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const f = Math.max(0, Math.min(1, fraction));
  return (
    <svg className="ring" width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`${label}${sub ? ` ${sub}` : ''}`}>
      <circle className="ring-track" cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} />
      <circle
        className="ring-fill"
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - f)}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text className="ring-label" x="50%" y={sub ? '47%' : '53%'} textAnchor="middle" dominantBaseline="middle" fontSize={size / 5.2}>
        {label}
      </text>
      {sub && (
        <text className="ring-sub" x="50%" y="66%" textAnchor="middle" dominantBaseline="middle">
          {sub}
        </text>
      )}
    </svg>
  );
}
