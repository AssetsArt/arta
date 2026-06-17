import { useState } from "react";
import { Check, Layout, SlidersHorizontal } from "lucide-react";
import type { Meta, Phase } from "../lib/types";
import { TAB_ORDER, normalizePhase } from "../lib/types";
import { MONO, useTheme, ACCENT_PRESETS } from "../lib/theme";
import { alpha } from "../lib/utils";

const STEP_LABEL: Record<Phase, string> = {
  prototype: "Prototype",
  data: "Data",
  flow: "Flow",
  plan: "Plan",
};

export function Topbar({ meta, setTab }: { meta: Meta; setTab: (t: Phase) => void }) {
  const { c } = useTheme();
  const curIdx = Math.max(0, TAB_ORDER.indexOf(normalizePhase(meta.phase)));

  return (
    <div
      className="flex h-14 shrink-0 items-center gap-4 border-b px-4"
      style={{ borderColor: c.border, background: c.bg }}
    >
      <div className="flex items-center gap-[11px]">
        <div
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
          style={{ background: c.accent }}
        >
          <Layout size={16} color="#09090b" />
        </div>
        <div className="flex flex-col whitespace-nowrap leading-[1.2]">
          <span className="text-[14px] font-semibold tracking-[-0.2px]" style={{ color: c.text }}>
            Harness Studio
          </span>
          <span className="text-[10.5px]" style={{ fontFamily: MONO, color: c.faint }}>
            {meta.name}
          </span>
        </div>
      </div>

      <div className="flex flex-1 justify-center">
        <Stepper curIdx={curIdx} setTab={setTab} />
      </div>

      <div className="flex items-center gap-2.5">
        <Settings />
        <div
          className="flex items-center gap-[7px] rounded-full py-1 pl-[9px] pr-2.5"
          style={{ border: `1px solid ${alpha(c.accent, 0.3)}`, background: alpha(c.accent, 0.08) }}
        >
          <span
            className="hs-pulse h-[7px] w-[7px] rounded-full"
            style={{ background: c.accent, boxShadow: `0 0 8px ${c.accent}` }}
          />
          <span
            className="text-[10.5px] font-medium tracking-[1px]"
            style={{ fontFamily: MONO, color: c.accent }}
          >
            LIVE
          </span>
        </div>
      </div>
    </div>
  );
}

function Stepper({ curIdx, setTab }: { curIdx: number; setTab: (t: Phase) => void }) {
  const { c } = useTheme();
  return (
    <div className="flex items-center">
      {TAB_ORDER.map((key, i) => {
        const done = i < curIdx;
        const active = i === curIdx;
        const col = done ? c.green : active ? c.accent : c.faint;
        return (
          <div key={key} className="flex items-center">
            <button
              onClick={() => setTab(key)}
              className="flex cursor-pointer items-center gap-2 rounded-[7px] px-1.5 py-1 transition-colors hover:bg-white/[0.04]"
            >
              <span
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold"
                style={{
                  fontFamily: MONO,
                  color: active ? "#09090b" : col,
                  background: active ? c.accent : done ? alpha(c.green, 0.15) : "transparent",
                  border: `1px solid ${active ? c.accent : done ? alpha(c.green, 0.45) : c.border}`,
                }}
              >
                {done ? <Check size={12} color={c.green} /> : i + 1}
              </span>
              <span
                className="text-[12.5px]"
                style={{
                  fontWeight: active ? 600 : 500,
                  color: active ? c.text : done ? c.dim : c.faint,
                }}
              >
                {STEP_LABEL[key]}
              </span>
            </button>
            {i < TAB_ORDER.length - 1 && (
              <span
                className="mx-[3px] h-px w-[22px]"
                style={{ background: i < curIdx ? alpha(c.green, 0.4) : c.border }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function Settings() {
  const { c, accent, setAccent, grid, setGrid } = useTheme();
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex h-7 w-7 items-center justify-center rounded-md transition-colors"
        style={{ color: open ? c.text : c.faint, background: open ? c.panel2 : "transparent" }}
        title="View settings"
      >
        <SlidersHorizontal size={15} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div
            className="absolute right-0 z-20 mt-2 w-56 rounded-xl p-3.5 shadow-2xl"
            style={{ background: c.panel, border: `1px solid ${c.border}` }}
          >
            <div
              className="mb-2.5 text-[9.5px] font-medium uppercase tracking-[0.6px]"
              style={{ fontFamily: MONO, color: c.faint }}
            >
              Accent
            </div>
            <div className="mb-4 flex gap-2">
              {ACCENT_PRESETS.map((p) => (
                <button
                  key={p}
                  onClick={() => setAccent(p)}
                  className="h-6 w-6 rounded-full transition-transform hover:scale-110"
                  style={{
                    background: p,
                    outline: accent === p ? `2px solid ${c.text}` : "none",
                    outlineOffset: 2,
                  }}
                />
              ))}
            </div>
            <button
              onClick={() => setGrid(!grid)}
              className="flex w-full items-center justify-between text-[12.5px]"
              style={{ color: c.dim }}
            >
              <span>Canvas grid</span>
              <span
                className="flex h-[18px] w-8 items-center rounded-full px-0.5 transition-colors"
                style={{ background: grid ? c.accent : c.border }}
              >
                <span
                  className="h-3.5 w-3.5 rounded-full bg-white transition-transform"
                  style={{ transform: grid ? "translateX(13px)" : "translateX(0)" }}
                />
              </span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
