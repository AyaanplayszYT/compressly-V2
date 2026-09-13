import React from 'react';

interface CircleRingProps {
  /** 0–100 progress percentage */
  progress?: number;
  /** 'idle' | 'running' | 'done' | 'error' */
  status: 'idle' | 'running' | 'done' | 'error';
  size?: number;
  stroke?: number;
}

export default function CircleRing({ progress = 0, status, size = 28, stroke = 3 }: CircleRingProps) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const filled = circ * (progress / 100);
  const empty = circ - filled;

  const trackColor  = 'var(--surface2)';
  const fillColor   = status === 'done' ? 'var(--green)'
                    : status === 'error' ? 'var(--red)'
                    : 'var(--accent)';

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{ flexShrink: 0, transform: 'rotate(-90deg)' }}
      className={`circle-ring ${status}`}
    >
      {/* Track */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={trackColor}
        strokeWidth={stroke}
      />
      {/* Fill */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={fillColor}
        strokeWidth={stroke}
        strokeDasharray={`${filled} ${empty}`}
        strokeLinecap="square"
        style={{
          transition: status === 'running' ? 'stroke-dasharray 200ms ease' : 'none',
        }}
      />
    </svg>
  );
}
