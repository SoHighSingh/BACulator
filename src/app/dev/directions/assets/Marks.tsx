/**
 * App icon proposals, one per direction, each drawn from that direction's signature on a 1024 grid.
 * No glass, no bubbles, no celebration: the mark is the instrument, not the drink.
 */
export type MarkId = "clinical" | "dial" | "forecast" | "native";

export function Mark({ id, size }: { id: MarkId; size: number }) {
  const r = 1024 * 0.2237; // iOS-like corner, so the proposal reads at home-screen scale
  return (
    <svg width={size} height={size} viewBox="0 0 1024 1024" role="img" aria-label={`${id} icon`}>
      {id === "clinical" && (
        <>
          <rect width="1024" height="1024" rx={r} fill="#0C0E10" />
          <rect x="176" y="472" width="672" height="80" rx="40" fill="#2A3036" />
          <rect x="330" y="472" width="420" height="80" rx="40" fill="#6DB3FF" />
          <rect x="452" y="400" width="40" height="224" rx="20" fill="#E9EDF0" />
        </>
      )}
      {id === "dial" && (
        <>
          <rect width="1024" height="1024" rx={r} fill="#0B0B0C" />
          {Array.from({ length: 60 }, (_, i) => {
            const a = (i / 60) * Math.PI * 2;
            const major = i % 5 === 0;
            const r1 = major ? 330 : 352;
            return (
              <line
                key={i}
                x1={512 + Math.sin(a) * r1}
                y1={512 - Math.cos(a) * r1}
                x2={512 + Math.sin(a) * 380}
                y2={512 - Math.cos(a) * 380}
                stroke={major ? "#EEE9E0" : "#6E6A64"}
                strokeWidth={major ? 16 : 6}
                strokeLinecap="round"
              />
            );
          })}
          <path d={arc(512, 512, 420, -40, 140)} stroke="#FF8F3F" strokeWidth="36" fill="none" strokeLinecap="round" />
          <line x1="512" y1="512" x2={512 + Math.sin((140 * Math.PI) / 180) * 280} y2={512 - Math.cos((140 * Math.PI) / 180) * 280} stroke="#EEE9E0" strokeWidth="28" strokeLinecap="round" />
          <circle cx="512" cy="512" r="36" fill="#E6D3AE" />
        </>
      )}
      {id === "forecast" && (
        <>
          <rect width="1024" height="1024" rx={r} fill="#0E1116" />
          <path d="M520 420 C640 430 760 540 860 760 L860 820 C760 700 640 560 520 470 Z" fill="#5B8DEF" fillOpacity="0.32" />
          <path d="M520 420 C640 420 760 600 860 820" fill="none" stroke="#5B8DEF" strokeWidth="0" />
          <path d="M164 780 C260 760 330 560 420 450 C460 410 490 420 520 420" fill="none" stroke="#F2F1EC" strokeWidth="40" strokeLinecap="round" />
          <path d="M520 420 C640 430 740 580 860 790" fill="none" stroke="#F2F1EC" strokeWidth="24" strokeDasharray="40 36" strokeLinecap="round" />
          <circle cx="520" cy="420" r="48" fill="#FFE45C" />
        </>
      )}
      {id === "native" && (
        <>
          <rect width="1024" height="1024" rx={r} fill="#1C1C1E" />
          {[
            [232, 520, 690],
            [372, 400, 630],
            [512, 300, 560],
            [652, 350, 570],
            [792, 450, 600],
          ].map(([x, top, bottom], i) => (
            <rect key={x} x={x! - 44} y={top} width="88" height={bottom! - top!} rx="44" fill="#F5B946" fillOpacity={i > 2 ? 0.4 : 1} />
          ))}
        </>
      )}
    </svg>
  );
}

function arc(cx: number, cy: number, radius: number, fromDeg: number, toDeg: number) {
  const p = (d: number) => [cx + Math.sin((d * Math.PI) / 180) * radius, cy - Math.cos((d * Math.PI) / 180) * radius];
  const [x0, y0] = p(fromDeg);
  const [x1, y1] = p(toDeg);
  return `M${x0} ${y0} A${radius} ${radius} 0 ${toDeg - fromDeg > 180 ? 1 : 0} 1 ${x1} ${y1}`;
}
