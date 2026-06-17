import { useState } from "react";
import { Braces, History, MessageSquarePlus, Send, SquarePen } from "lucide-react";
import type { Meta, Phase } from "../lib/types";
import type { ChangeEntry } from "../lib/useHarness";
import { MONO, useTheme } from "../lib/theme";
import { sendFeedback } from "../lib/useHarness";

interface Props {
  meta: Meta;
  updatedAt: string;
  tab: Phase;
  screen: string | undefined;
  changes: ChangeEntry[];
  onEditState: () => void;
  onJump: (ch: ChangeEntry) => void;
}

export function StatusBar({ meta, updatedAt, tab, screen, changes, onEditState, onJump }: Props) {
  const { c } = useTheme();
  return (
    <div
      className="flex h-[30px] shrink-0 items-center gap-2.5 border-t px-3.5 text-[11px]"
      style={{ borderColor: c.border, background: c.bg, fontFamily: MONO, color: c.faint }}
    >
      <Braces size={13} color={c.dim} />
      <span>.harness/state.json</span>
      <span style={{ color: c.border }}>/</span>
      <span>phase: {meta.phase}</span>
      <div className="ml-auto flex items-center gap-3.5">
        <ChangesButton changes={changes} onJump={onJump} />
        <FeedbackButton tab={tab} screen={screen} />
        <span>updated {updatedAt}</span>
        <button
          onClick={onEditState}
          className="flex items-center gap-1.5 rounded-[7px] px-2.5 py-1 transition-colors"
          style={{ color: c.dim, border: `1px solid ${c.border}`, background: c.panel2 }}
        >
          <SquarePen size={12} />
          Edit state
        </button>
      </div>
    </div>
  );
}

// A legible feed of what the AI just changed — so the dev can follow the edits
// (and jump to a screen the AI touched) instead of guessing from a flash.
function ChangesButton({ changes, onJump }: { changes: ChangeEntry[]; onJump: (ch: ChangeEntry) => void }) {
  const { c } = useTheme();
  const [open, setOpen] = useState(false);
  const KIND_COLOR: Record<string, string> = {
    screen: c.accent,
    component: c.amber,
    designSystem: c.green,
    state: c.dim,
  };
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-[7px] px-2.5 py-1 transition-colors"
        style={{ color: open ? c.text : c.dim, border: `1px solid ${c.border}`, background: open ? "#26262b" : c.panel2 }}
      >
        <History size={12} />
        Changes
        {changes.length > 0 && (
          <span
            className="rounded-full px-1.5 text-[9px] font-semibold"
            style={{ background: c.accent, color: "#09090b" }}
          >
            {changes.length}
          </span>
        )}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div
            className="absolute bottom-8 right-0 z-20 max-h-72 w-80 overflow-auto rounded-xl p-2 shadow-2xl"
            style={{ background: c.panel, border: `1px solid ${c.border}` }}
          >
            {changes.length === 0 ? (
              <div className="px-2 py-3 text-center text-[11px]" style={{ color: c.faint }}>
                No edits yet — changes the AI makes will appear here.
              </div>
            ) : (
              changes.map((ch, i) => (
                <button
                  key={i}
                  onClick={() => {
                    onJump(ch);
                    setOpen(false);
                  }}
                  className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left transition-colors hover:bg-white/[0.04]"
                >
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: KIND_COLOR[ch.kind] || c.faint }} />
                  <span className="flex-1 truncate text-[12px]" style={{ color: c.text, fontFamily: "var(--font-sans)" }}>
                    {ch.label}
                  </span>
                  <span className="shrink-0 text-[10px]" style={{ color: c.faint }}>
                    {ch.at}
                  </span>
                </button>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}

// Lets the dev leave a note from inside the viewer. The MCP server drains it via
// harness_get_feedback, so the dev → AI half of the loop never leaves the screen.
function FeedbackButton({ tab, screen }: { tab: Phase; screen: string | undefined }) {
  const { c } = useTheme();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [sent, setSent] = useState(false);

  const submit = async () => {
    const t = text.trim();
    if (!t) return;
    const ok = await sendFeedback({ text: t, tab, screen });
    if (ok) {
      setText("");
      setSent(true);
      setTimeout(() => {
        setSent(false);
        setOpen(false);
      }, 1100);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-[7px] px-2.5 py-1 transition-colors"
        style={{ color: open ? c.text : c.dim, border: `1px solid ${c.border}`, background: open ? "#26262b" : c.panel2 }}
      >
        <MessageSquarePlus size={12} />
        Feedback
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div
            className="absolute bottom-8 right-0 z-20 w-80 rounded-xl p-3 shadow-2xl"
            style={{ background: c.panel, border: `1px solid ${c.border}` }}
          >
            <div className="mb-2 text-[10px] uppercase tracking-[0.6px]" style={{ color: c.faint }}>
              Note for the agent · {tab}
              {screen ? ` · ${screen}` : ""}
            </div>
            <textarea
              autoFocus
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
              }}
              placeholder="e.g. Call-next should confirm before skipping…"
              spellCheck={false}
              className="h-20 w-full resize-none rounded-lg p-2.5 text-[12px] leading-[1.5] outline-none"
              style={{
                fontFamily: "var(--font-sans)",
                background: c.bg,
                border: `1px solid ${c.border}`,
                color: c.text,
              }}
            />
            <div className="mt-2 flex items-center justify-between">
              <span className="text-[10px]" style={{ color: c.faint }}>
                {sent ? "✓ sent to agent" : "⌘↵ to send"}
              </span>
              <button
                onClick={submit}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-semibold transition-colors"
                style={{ background: c.accent, color: "#09090b" }}
              >
                <Send size={12} />
                Send
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
