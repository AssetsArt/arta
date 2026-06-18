import { useState } from "react";
import { Check, Moon, Sun, SlidersHorizontal } from "lucide-react";
import type { Meta, Phase } from "../lib/types";
import { TAB_ORDER, normalizePhase } from "../lib/types";
import { MONO, useTheme, ACCENT_PRESETS } from "../lib/theme";

const STEP_LABEL: Record<Phase, string> = {
  prototype: "Prototype",
  data: "Data",
  flow: "Flow",
  architecture: "Architecture",
  plan: "Plan",
};

export function Topbar({ meta, setTab }: { meta: Meta; setTab: (t: Phase) => void }) {
  const { c, mode, toggleMode } = useTheme();
  const curIdx = Math.max(0, TAB_ORDER.indexOf(normalizePhase(meta.phase)));

  return (
    <div
      className="flex h-12 shrink-0 items-center gap-[14px] px-[14px]"
      style={{ borderBottom: `1px solid ${c.border}`, background: c.bg }}
    >
      <div className="flex items-center gap-[9px] whitespace-nowrap">
        <div
          className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-md text-[13px] font-bold"
          style={{ background: c.invBg, color: c.invFg, letterSpacing: "-0.5px" }}
        >
          H
        </div>
        <span className="text-[14px] font-semibold tracking-[-0.2px]" style={{ color: c.text }}>
          Harness&nbsp;Studio
        </span>
        <span style={{ color: c.borderStrong }}>/</span>
        <span className="text-[14px] font-medium" style={{ color: c.dim }}>
          {meta.name}
        </span>
      </div>

      <div className="flex flex-1 justify-center">
        <Stepper curIdx={curIdx} setTab={setTab} />
      </div>

      <div className="flex items-center gap-2">
        <Settings />
        <button
          onClick={toggleMode}
          className="flex h-7 items-center gap-1.5 rounded-[7px] px-[9px] text-[12px]"
          style={{ border: `1px solid ${c.border2}`, background: c.panel, color: c.dim }}
          title="Toggle theme"
        >
          {mode === "dark" ? <Moon size={13} /> : <Sun size={13} />}
          <span>{mode === "dark" ? "Dark" : "Light"}</span>
        </button>
        <div
          className="flex h-7 items-center gap-[7px] rounded-[7px] pl-2 pr-2.5"
          style={{ border: `1px solid ${c.border2}`, background: c.panel }}
        >
          <span
            className="h-[7px] w-[7px] rounded-full"
            style={{ background: c.green, animation: "livePulse 2.2s ease-out infinite" }}
          />
          <span className="text-[11px] font-semibold tracking-[0.4px]" style={{ color: c.text }}>
            LIVE
          </span>
          <span className="text-[11px]" style={{ fontFamily: MONO, color: c.faint }}>
            agent
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
        return (
          <div key={key} className="flex items-center">
            <button
              onClick={() => setTab(key)}
              className="flex cursor-pointer items-center gap-[7px]"
            >
              <span
                className="flex h-[17px] w-[17px] shrink-0 items-center justify-center rounded-full text-[9.5px] font-bold"
                style={
                  done
                    ? { background: c.invBg, color: c.invFg }
                    : active
                      ? {
                          background: c.accentSoft,
                          border: `1.5px solid ${c.accent}`,
                          color: c.accent2,
                          boxShadow: `0 0 10px ${c.accentSoft}`,
                        }
                      : { border: `1px solid ${c.borderStrong}`, color: c.faint }
                }
              >
                {done ? <Check size={11} /> : i + 1}
              </span>
              <span
                className="text-[12px]"
                style={{
                  fontWeight: active ? 600 : 500,
                  color: active || done ? c.text : c.faint,
                }}
              >
                {STEP_LABEL[key]}
              </span>
            </button>
            {i < TAB_ORDER.length - 1 && (
              <span
                className="mx-[9px] h-px w-[22px]"
                style={{ background: i < curIdx ? c.faint : c.border2 }}
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
            className="absolute right-0 z-20 mt-2 w-56 rounded-xl p-3.5"
            style={{ background: c.panel, border: `1px solid ${c.border2}`, boxShadow: c.shadow }}
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
                style={{ background: grid ? c.accent : c.borderStrong }}
              >
                <span
                  className="h-3.5 w-3.5 rounded-full transition-transform"
                  style={{ background: "#fff", transform: grid ? "translateX(13px)" : "translateX(0)" }}
                />
              </span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
