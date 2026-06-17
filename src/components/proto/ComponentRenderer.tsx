import { ChevronDown, ImageIcon } from "lucide-react";
import type { Component } from "../../lib/types";
import { cn } from "../../lib/utils";

interface Props {
  comp: Component;
  screen: string | undefined;
  go: (to?: string) => void;
}

// Renders one prototype component as a real shadcn-styled (light) element.
// The device frame in PrototypeTab composes these into a screen.
export function ComponentRenderer({ comp: c, screen, go }: Props) {
  switch (c.type) {
    case "nav":
      return (
        <div className="inline-flex gap-[3px] self-start rounded-[9px] bg-l-muted p-1">
          {(c.items || []).map((raw, i) => {
            const it = typeof raw === "string" ? { label: raw } : raw;
            const active = "to" in it && it.to === screen;
            return (
              <button
                key={i}
                onClick={() => go("to" in it ? it.to : undefined)}
                className={cn(
                  "rounded-md px-[13px] py-[5px] text-[13px] font-medium transition-colors",
                  active
                    ? "bg-l-bg text-l-fg shadow-[0_1px_2px_rgba(0,0,0,0.08)]"
                    : "text-l-muted-fg hover:text-[#3f3f46]"
                )}
              >
                {it.label}
              </button>
            );
          })}
        </div>
      );

    case "heading":
      return (
        <div className="text-[18px] font-semibold tracking-[-0.3px] text-l-fg">{c.text}</div>
      );

    case "text":
      return <div className="text-[13.5px] leading-[1.55] text-l-muted-fg">{c.text}</div>;

    case "input":
      return (
        <label className="flex flex-col gap-[7px]">
          <span className="text-[13px] font-medium text-l-fg">{c.label}</span>
          <div className="flex h-[38px] items-center rounded-lg border border-l-border bg-l-bg px-3 text-[13.5px] text-l-faint">
            {c.placeholder || ""}
          </div>
        </label>
      );

    case "select":
      return (
        <label className="flex flex-col gap-[7px]">
          <span className="text-[13px] font-medium text-l-fg">{c.label}</span>
          <div className="flex h-[38px] items-center justify-between rounded-lg border border-l-border bg-l-bg px-3 text-[13.5px] text-l-fg">
            <span>{(c.options && c.options[0]) || "Select…"}</span>
            <ChevronDown size={16} className="text-l-faint" />
          </div>
        </label>
      );

    case "button": {
      const prim = c.variant === "primary";
      return (
        <button
          onClick={() => go(c.to)}
          className={cn(
            "inline-flex h-[38px] items-center justify-center rounded-lg px-4 text-[13px] font-medium transition-colors",
            prim
              ? "border border-l-primary bg-l-primary text-l-primary-fg hover:bg-[#27272a]"
              : "border border-l-border bg-l-bg text-l-fg hover:bg-l-muted"
          )}
        >
          {c.text}
        </button>
      );
    }

    case "row":
      return (
        <div className="flex flex-wrap items-center gap-[10px]">
          {(c.children || []).map((cc, i) => (
            <ComponentRenderer key={i} comp={cc} screen={screen} go={go} />
          ))}
        </div>
      );

    case "card":
      return (
        <div className="flex flex-col gap-3 rounded-[10px] border border-l-border bg-l-bg p-4">
          {(c.children || []).map((cc, i) => (
            <ComponentRenderer key={i} comp={cc} screen={screen} go={go} />
          ))}
        </div>
      );

    case "table": {
      const cols = c.columns || [];
      const rows = c.rows || [];
      const gt = `repeat(${cols.length || 1},1fr)`;
      return (
        <div className="overflow-hidden rounded-[9px] border border-l-border">
          <div
            className="grid border-b border-l-border bg-l-muted"
            style={{ gridTemplateColumns: gt }}
          >
            {cols.map((col, i) => (
              <div key={i} className="px-[13px] py-[9px] text-[11.5px] font-medium text-l-muted-fg">
                {col}
              </div>
            ))}
          </div>
          {rows.map((r, ri) => (
            <div
              key={ri}
              className={cn("grid", ri < rows.length - 1 && "border-b border-l-border")}
              style={{ gridTemplateColumns: gt }}
            >
              {r.map((cell, ci) => (
                <div key={ci} className="px-[13px] py-[10px] text-[13px] text-l-fg">
                  {cell}
                </div>
              ))}
            </div>
          ))}
        </div>
      );
    }

    case "list":
      return (
        <div className="flex flex-col gap-2">
          {((c.items as string[]) || []).map((it, i) => (
            <div key={i} className="flex items-center gap-[9px] text-[13.5px] text-l-fg">
              <span className="h-1 w-1 rounded-full bg-l-faint" />
              {typeof it === "string" ? it : ""}
            </div>
          ))}
        </div>
      );

    case "badge":
      return (
        <span className="inline-flex items-center rounded-md border border-l-border bg-l-muted px-[9px] py-[3px] text-[11.5px] font-medium text-l-fg">
          {c.text}
        </span>
      );

    case "image":
      return (
        <div
          className="flex flex-col items-center justify-center gap-1.5 rounded-[9px] border border-dashed border-l-border bg-l-muted text-[11.5px] text-l-faint"
          style={{ height: c.h || 120 }}
        >
          <ImageIcon size={20} className="text-l-faint" />
          {c.label || "image"}
        </div>
      );

    case "divider":
      return <div className="my-1 border-t border-l-border" />;

    default:
      return (
        <div className="font-mono text-[11px] text-[#dc2626]">unknown component: {c.type}</div>
      );
  }
}
