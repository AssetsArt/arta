import type { Phase } from "../lib/types";
import { MONO, useTheme } from "../lib/theme";
import { cn } from "../lib/utils";

const TABS: { key: Phase; label: string }[] = [
  { key: "prototype", label: "Prototype + Spec" },
  { key: "data", label: "Data model" },
  { key: "flow", label: "Flow (API)" },
  { key: "architecture", label: "Architecture" },
  { key: "plan", label: "Plan" },
];

export function TabBar({ tab, setTab }: { tab: Phase; setTab: (t: Phase) => void }) {
  const { c } = useTheme();
  return (
    <div
      className="flex h-[45px] shrink-0 items-center gap-2.5 px-[14px]"
      style={{ borderBottom: `1px solid ${c.border}`, background: c.panel }}
    >
      <div
        className="inline-flex gap-[2px] rounded-[9px] p-[3px]"
        style={{ background: c.bg, border: `1px solid ${c.border}` }}
      >
        {TABS.map(({ key, label }) => {
          const active = tab === key;
          return (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={cn(
                "h-[31px] whitespace-nowrap rounded-md px-[13px] text-[12.5px] transition-colors",
                !active && "hover:opacity-80"
              )}
              style={{
                fontWeight: active ? 600 : 500,
                color: active ? c.text : c.faint,
                background: active ? c.card : "transparent",
                boxShadow: active ? "0 1px 2px rgba(0,0,0,.3)" : "none",
              }}
            >
              {label}
            </button>
          );
        })}
      </div>
      <div className="flex-1" />
      <div className="flex items-center gap-2 text-[11px]" style={{ fontFamily: MONO, color: c.faint }}>
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: c.accent }} />
        <span>read-only · viewing</span>
      </div>
    </div>
  );
}
