// A side-view line drawing that inks itself in as the visitor picks
// make, model, generation and engine. Pure SVG + CSS, no libraries.
const BODY =
  "M48 228 L48 206 Q48 192 66 188 L138 174 Q168 150 214 134 L388 134 Q436 136 470 166 L548 180 Q584 188 590 208 L590 228 H520 A42 42 0 0 0 436 228 H192 A42 42 0 0 0 108 228 Z";
const GLASS = [
  "M158 168 Q182 148 222 140 L302 140 L302 168 Z",
  "M314 140 L386 140 Q422 142 448 168 L314 168 Z",
];
const WHEELS = [150, 478];
const BAY = "M486 178 L540 186 L540 212 L486 212 Z";
const LIGHTS = ["M560 190 L584 196 L582 206 L556 202 Z", "M50 196 L50 210 L62 208 L62 198 Z"];

const short = (s, n = 20) => (s && s.length > n ? s.slice(0, n - 1) + "…" : s || "");

function Strokes({ ink, on = [] }) {
  const p = ink ? { pathLength: 1 } : {};
  const cls = (n) => (ink && on[n] ? "on" : "");
  return (
    <>
      <g className={`g-body ${cls(0)}`}>
        <path d={BODY} {...p} />
        <path d="M280 176h20" {...p} />
      </g>
      <g className={`g-glass ${cls(1)}`}>
        {GLASS.map((d) => <path key={d} d={d} {...p} />)}
      </g>
      <g className={`g-wheels ${cls(2)}`}>
        {WHEELS.map((cx) => (
          <g key={cx} className="wheel" style={{ transformOrigin: `${cx}px 228px` }}>
            <circle cx={cx} cy="228" r="34" {...p} />
            <circle cx={cx} cy="228" r="18" {...p} />
            {[0, 1, 2, 3, 4].map((a) => {
              const r = ((a * 72 - 90) * Math.PI) / 180;
              return (
                <path key={a} {...p}
                  d={`M${cx} 228 L${(cx + 18 * Math.cos(r)).toFixed(1)} ${(228 + 18 * Math.sin(r)).toFixed(1)}`} />
              );
            })}
          </g>
        ))}
      </g>
      <g className={`g-engine ${cls(3)}`}>
        <path d={BAY} {...p} />
        {[498, 512, 526].map((x) => <path key={x} d={`M${x} 190v16`} {...p} />)}
        {LIGHTS.map((d) => <path key={d} d={d} {...p} />)}
      </g>
    </>
  );
}

export default function CarDraw({ sel }) {
  const on = [sel.make, sel.model, sel.gen, sel.engine].map(Boolean);
  return (
    <svg className="draw-svg" viewBox="0 0 640 310" role="img"
      aria-label="Line drawing of a car that fills in as you choose your make, model, generation and engine">
      <line className="ground" x1="16" y1="262" x2="624" y2="262" />
      <g className="ghost"><Strokes /></g>
      <g className="ink"><Strokes ink on={on} /></g>
      <path className={`glow ${on[3] ? "on" : ""}`} d={BAY} />

      <g className={`callout ${on[0] ? "on" : ""}`}>
        <path d="M62 104 L84 183" /><circle cx="84" cy="183" r="3" />
        <text x="34" y="96">{short(sel.make)}</text>
      </g>
      <g className={`callout ${on[1] ? "on" : ""}`}>
        <path d="M262 92 L262 140" /><circle cx="262" cy="140" r="3" />
        <text x="236" y="84">{short(sel.model)}</text>
      </g>
      <g className={`callout ${on[2] ? "on" : ""}`}>
        <path d="M150 266 L150 278" /><circle cx="150" cy="264" r="3" />
        <text x="150" y="299" textAnchor="middle">{short(sel.gen, 14)}</text>
      </g>
      <g className={`callout ${on[3] ? "on" : ""}`}>
        <path d="M512 104 L512 194" /><circle cx="512" cy="194" r="3" />
        <text x="440" y="96">{short(sel.engine, 22)}</text>
      </g>
    </svg>
  );
}
