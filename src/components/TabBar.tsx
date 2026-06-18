import { Boxes, Database, ListChecks, Monitor, Workflow } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Phase } from "../lib/types";
import { useTheme } from "../lib/theme";
import { cn } from "../lib/utils";

const TABS: { key: Phase; label: string; Icon: LucideIcon }[] = [
  { key: "prototype", label: "Prototype + Spec", Icon: Monitor },
  { key: "data", label: "Data model", Icon: Database },
  { key: "flow", label: "Flow", Icon: Workflow },
  { key: "architecture", label: "Architecture", Icon: Boxes },
  { key: "plan", label: "Plan", Icon: ListChecks },
];

export function TabBar({ tab, setTab }: { tab: Phase; setTab: (t: Phase) => void }) {
  const { c } = useTheme();
  return (
    <div
      className="flex shrink-0 items-center border-b px-3.5 py-2"
      style={{ borderColor: c.border, background: c.bg }}
    >
      <div
        className="inline-flex gap-[3px] rounded-[9px] p-1"
        style={{ background: c.panel2, border: `1px solid ${c.borderSoft}` }}
      >
        {TABS.map(({ key, label, Icon }) => {
          const active = tab === key;
          return (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={cn(
                "flex items-center gap-[7px] whitespace-nowrap rounded-md px-[13px] py-1.5 text-[13px] font-medium transition-colors",
                !active && "hover:bg-white/[0.03]"
              )}
              style={{
                color: active ? c.text : c.dim,
                background: active ? c.card : "transparent",
                boxShadow: active ? "0 1px 2px rgba(0,0,0,.4)" : "none",
              }}
            >
              <Icon size={15} color={active ? c.accent : c.faint} />
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
