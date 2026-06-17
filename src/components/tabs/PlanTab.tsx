import { Box, Circle, CircleCheck, CircleDot } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Plan, TaskStatus } from "../../lib/types";
import { MONO, useTheme } from "../../lib/theme";
import { alpha } from "../../lib/utils";
import { Card, SectionHead } from "../ui/panel";

export function PlanTab({ plan }: { plan: Plan }) {
  const { c } = useTheme();
  const statusMeta: Record<TaskStatus, { color: string; Icon: LucideIcon }> = {
    done: { color: c.green, Icon: CircleCheck },
    doing: { color: c.amber, Icon: CircleDot },
    todo: { color: c.faint, Icon: Circle },
  };

  return (
    <div className="mx-auto flex max-w-[980px] flex-col gap-4">
      <Card>
        <SectionHead label="Tech stack" Icon={Box} />
        <div className="flex flex-wrap gap-2">
          {(plan.stack || []).map((s) => (
            <span
              key={s}
              className="rounded-[7px] px-[11px] py-[5px] text-[12px]"
              style={{ fontFamily: MONO, background: c.panel2, border: `1px solid ${c.border}`, color: c.text }}
            >
              {s}
            </span>
          ))}
        </div>
      </Card>

      {(plan.milestones || []).map((m, mi) => {
        const tasks = m.tasks || [];
        const done = tasks.filter((t) => t.status === "done").length;
        const pct = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
        return (
          <Card key={mi}>
            <div className="mb-[13px] flex items-center gap-3">
              <div className="text-[15px] font-semibold" style={{ color: c.text }}>
                {m.name}
              </div>
              <div className="ml-auto text-[11px]" style={{ fontFamily: MONO, color: c.dim }}>
                {done} / {tasks.length}
              </div>
            </div>
            <div className="mb-3.5 h-1.5 overflow-hidden rounded-[3px]" style={{ background: c.panel2 }}>
              <div className="h-full rounded-[3px] transition-[width] duration-500" style={{ width: `${pct}%`, background: c.accent }} />
            </div>
            <div className="flex flex-col gap-px">
              {tasks.map((t, ti) => {
                const sm = statusMeta[t.status] || statusMeta.todo;
                const { Icon } = sm;
                return (
                  <div key={ti} className="flex items-center gap-[11px] px-1 py-2">
                    <Icon size={17} color={sm.color} />
                    <span
                      className="text-[13.5px]"
                      style={{
                        color: t.status === "done" ? c.dim : c.text,
                        textDecoration: t.status === "done" ? "line-through" : "none",
                      }}
                    >
                      {t.title}
                    </span>
                    <span
                      className="ml-auto rounded-md px-2 py-0.5 text-[9.5px] uppercase tracking-[0.6px]"
                      style={{ fontFamily: MONO, color: sm.color, border: `1px solid ${alpha(sm.color, 0.35)}`, background: alpha(sm.color, 0.1) }}
                    >
                      {t.status}
                    </span>
                  </div>
                );
              })}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
