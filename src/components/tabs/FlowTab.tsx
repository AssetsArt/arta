import { Database, Monitor, Zap } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Flow, FlowKind } from "../../lib/types";
import { MONO, useTheme } from "../../lib/theme";
import { alpha } from "../../lib/utils";
import { Card } from "../ui/panel";

const KINDS: FlowKind[] = ["screen", "api", "entity"];
const COL_X = [40, 330, 620];
const W = 170;
const H = 54;
const TOP = 64;
const GAP_Y = 84;
const COL_LABEL = ["SCREENS", "APIS", "ENTITIES"];
const KIND_ICON: Record<FlowKind, LucideIcon> = { screen: Monitor, api: Zap, entity: Database };

export function FlowTab({ flow }: { flow: Flow }) {
  const { c } = useTheme();
  const nodes = flow.nodes || [];
  const edges = flow.edges || [];
  const colColor: Record<FlowKind, string> = { screen: c.accent, api: c.amber, entity: c.green };

  const byKind: Record<string, typeof nodes> = { screen: [], api: [], entity: [] };
  nodes.forEach((n) => (byKind[n.kind] || (byKind[n.kind] = [])).push(n));

  const pos: Record<string, { x: number; y: number }> = {};
  KINDS.forEach((k, ci) => (byKind[k] || []).forEach((n, ri) => (pos[n.id] = { x: COL_X[ci], y: TOP + ri * GAP_Y })));

  const maxRows = Math.max(1, byKind.screen.length, byKind.api.length, byKind.entity.length);
  const svgW = COL_X[2] + W + 40;
  const svgH = TOP + maxRows * GAP_Y + 20;

  const legItem = (col: string, label: string, dash: boolean) => (
    <div key={label} className="flex items-center gap-[7px]">
      <span className="h-0 w-5" style={{ borderTop: `2px ${dash ? "dashed" : "solid"} ${col}` }} />
      <span>{label}</span>
    </div>
  );

  return (
    <div className="mx-auto flex max-w-[1000px] flex-col gap-3.5">
      <div className="flex flex-wrap items-center gap-5 text-[11px]" style={{ fontFamily: MONO, color: c.dim }}>
        {legItem(c.accent, "read", true)}
        {legItem(c.amber, "write", false)}
      </div>
      <Card>
        <div className="overflow-x-auto">
          <svg width={svgW} height={svgH} style={{ display: "block", minWidth: svgW }}>
            <defs>
              <marker id="hs-arr-c" viewBox="0 0 10 10" refX={9} refY={5} markerWidth={7} markerHeight={7} orient="auto-start-reverse">
                <path d="M0,0 L10,5 L0,10 z" fill={c.accent} />
              </marker>
              <marker id="hs-arr-a" viewBox="0 0 10 10" refX={9} refY={5} markerWidth={7} markerHeight={7} orient="auto-start-reverse">
                <path d="M0,0 L10,5 L0,10 z" fill={c.amber} />
              </marker>
            </defs>

            {KINDS.map((k, ci) => (
              <text
                key={`h${ci}`}
                x={COL_X[ci] + W / 2}
                y={32}
                fill={colColor[k]}
                fontFamily="var(--font-mono)"
                fontSize={10}
                letterSpacing={1.4}
                textAnchor="middle"
              >
                {COL_LABEL[ci]}
              </text>
            ))}

            {edges.map((ed, i) => {
              const fp = pos[ed.from];
              const tp = pos[ed.to];
              if (!fp || !tp) return null;
              const read = ed.op === "read";
              const col = read ? c.accent : c.amber;
              const sx = fp.x + W;
              const sy = fp.y + H / 2;
              const tx = tp.x;
              const ty = tp.y + H / 2;
              const midx = (sx + tx) / 2;
              const els = [
                <path
                  key={`e${i}`}
                  d={`M${sx},${sy} C${midx},${sy} ${midx},${ty} ${tx},${ty}`}
                  stroke={col}
                  strokeWidth={1.6}
                  fill="none"
                  opacity={0.85}
                  markerEnd={`url(#${read ? "hs-arr-c" : "hs-arr-a"})`}
                  strokeDasharray={read ? "5 4" : "none"}
                />,
              ];
              if (ed.label) {
                const mx = (sx + tx) / 2;
                const my = (sy + ty) / 2 - 6;
                const w = ed.label.length * 6.3 + 12;
                els.push(
                  <rect key={`el${i}`} x={mx - w / 2} y={my - 10} width={w} height={17} rx={5} fill={c.card} stroke={alpha(col, 0.4)} />,
                  <text key={`et${i}`} x={mx} y={my + 1.5} fill={col} fontFamily="var(--font-mono)" fontSize={9.5} textAnchor="middle">
                    {ed.label}
                  </text>
                );
              }
              return els;
            })}

            {nodes.map((n, i) => {
              const p = pos[n.id];
              if (!p) return null;
              const col = colColor[n.kind] || c.dim;
              const Icon = KIND_ICON[n.kind] || Database;
              return (
                <g key={`g${i}`}>
                  <rect x={p.x} y={p.y} width={W} height={H} rx={10} fill={c.card} stroke={alpha(col, 0.55)} strokeWidth={1.5} />
                  <rect x={p.x} y={p.y + 7} width={3} height={H - 14} rx={2} fill={col} />
                  <foreignObject x={p.x + 13} y={p.y + 10} width={22} height={22}>
                    <div style={{ color: col }}>
                      <Icon size={16} color={col} />
                    </div>
                  </foreignObject>
                  <text x={p.x + 42} y={p.y + 23} fill={c.text} fontFamily="var(--font-mono)" fontSize={12}>
                    {n.label}
                  </text>
                  <text x={p.x + 42} y={p.y + 38} fill={alpha(col, 0.95)} fontFamily="var(--font-mono)" fontSize={8.5} letterSpacing={1}>
                    {(n.kind || "").toUpperCase()}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </Card>
    </div>
  );
}
