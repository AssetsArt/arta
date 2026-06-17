import { BatteryFull, Signal, Wifi } from "lucide-react";
import type { FrameKind } from "../../lib/types";
import { LIGHT, MONO, useTheme } from "../../lib/theme";

interface Props {
  frame: FrameKind;
  url: string;
  title: string;
  children: React.ReactNode;
}

const BEZEL = "#0b0b0c";

// Wraps the freeform iframe in a believable device frame so the same HTML can be
// previewed as desktop web, a native desktop app, or an iOS / Android phone.
export function DeviceFrame({ frame, url, title, children }: Props) {
  if (frame === "ios") return <IosFrame title={title}>{children}</IosFrame>;
  if (frame === "android") return <AndroidFrame title={title}>{children}</AndroidFrame>;
  if (frame === "desktop") return <DesktopFrame title={title}>{children}</DesktopFrame>;
  return <WebFrame url={url}>{children}</WebFrame>;
}

function TrafficLights() {
  return (
    <div className="flex gap-1.5">
      <span className="h-3 w-3 rounded-full" style={{ background: "#ff5f57" }} />
      <span className="h-3 w-3 rounded-full" style={{ background: "#febc2e" }} />
      <span className="h-3 w-3 rounded-full" style={{ background: "#28c840" }} />
    </div>
  );
}

function WebFrame({ url, children }: { url: string; children: React.ReactNode }) {
  const { c } = useTheme();
  return (
    <div
      className="flex h-full w-full max-w-[1180px] flex-col overflow-hidden rounded-[12px]"
      style={{ background: LIGHT.bg, border: `1px solid ${c.border}`, boxShadow: "0 24px 64px rgba(0,0,0,.5)" }}
    >
      <div
        className="flex shrink-0 items-center gap-3 border-b px-3.5 py-2.5"
        style={{ borderColor: LIGHT.border, background: LIGHT.muted }}
      >
        <TrafficLights />
        <div
          className="flex h-7 flex-1 items-center rounded-md px-3 text-[12px]"
          style={{ background: LIGHT.bg, border: `1px solid ${LIGHT.border}`, color: LIGHT.mutedFg, fontFamily: MONO }}
        >
          {url}
        </div>
      </div>
      {children}
    </div>
  );
}

function DesktopFrame({ title, children }: { title: string; children: React.ReactNode }) {
  const { c } = useTheme();
  return (
    <div
      className="flex h-full w-full max-w-[1180px] flex-col overflow-hidden rounded-[12px]"
      style={{ background: LIGHT.bg, border: `1px solid ${c.border}`, boxShadow: "0 24px 64px rgba(0,0,0,.5)" }}
    >
      <div
        className="relative flex shrink-0 items-center border-b px-3.5 py-2.5"
        style={{ borderColor: LIGHT.border, background: LIGHT.muted }}
      >
        <TrafficLights />
        <div
          className="pointer-events-none absolute inset-x-0 text-center text-[12px] font-medium"
          style={{ color: LIGHT.mutedFg }}
        >
          {title}
        </div>
      </div>
      {children}
    </div>
  );
}

// Shared phone shell: dark bezel + rounded screen, sized to fit the canvas.
function Phone({
  radius,
  screenRadius,
  pad,
  width,
  statusBar,
  bottom,
  children,
}: {
  radius: number;
  screenRadius: number;
  pad: number;
  width: number;
  statusBar: React.ReactNode;
  bottom: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div
      className="relative flex flex-col"
      style={{
        width,
        height: `min(820px, 100%)`,
        background: BEZEL,
        borderRadius: radius,
        padding: pad,
        boxShadow: "0 30px 70px rgba(0,0,0,.55)",
      }}
    >
      <div
        className="relative flex min-h-0 flex-1 flex-col overflow-hidden"
        style={{ background: LIGHT.bg, borderRadius: screenRadius }}
      >
        {statusBar}
        <div className="relative min-h-0 flex-1">{children}</div>
        {bottom}
      </div>
    </div>
  );
}

function StatusIcons() {
  return (
    <div className="flex items-center gap-1.5" style={{ color: LIGHT.fg }}>
      <Signal size={14} />
      <Wifi size={14} />
      <BatteryFull size={18} />
    </div>
  );
}

function IosFrame({ children }: { title: string; children: React.ReactNode }) {
  return (
    <Phone
      width={384}
      radius={52}
      screenRadius={42}
      pad={11}
      statusBar={
        <div className="relative flex h-11 shrink-0 items-center justify-between px-7 pt-1">
          <span className="text-[14px] font-semibold" style={{ color: LIGHT.fg }}>
            9:41
          </span>
          {/* Dynamic Island */}
          <span className="absolute left-1/2 top-2 h-[26px] w-[96px] -translate-x-1/2 rounded-full bg-black" />
          <StatusIcons />
        </div>
      }
      bottom={
        <div className="flex h-6 shrink-0 items-end justify-center pb-2">
          <span className="h-[5px] w-[134px] rounded-full" style={{ background: "rgba(0,0,0,.85)" }} />
        </div>
      }
    >
      {children}
    </Phone>
  );
}

function AndroidFrame({ children }: { title: string; children: React.ReactNode }) {
  return (
    <Phone
      width={392}
      radius={40}
      screenRadius={30}
      pad={9}
      statusBar={
        <div className="relative flex h-8 shrink-0 items-center justify-between px-4">
          <span className="text-[12px] font-medium" style={{ color: LIGHT.fg }}>
            9:41
          </span>
          {/* punch-hole camera */}
          <span className="absolute left-1/2 top-2.5 h-3 w-3 -translate-x-1/2 rounded-full bg-black" />
          <div className="flex items-center gap-1.5" style={{ color: LIGHT.fg }}>
            <Signal size={13} />
            <Wifi size={13} />
            <BatteryFull size={16} />
          </div>
        </div>
      }
      bottom={
        <div className="flex h-6 shrink-0 items-center justify-center pb-1.5">
          <span className="h-[4px] w-[118px] rounded-full" style={{ background: "rgba(0,0,0,.55)" }} />
        </div>
      }
    >
      {children}
    </Phone>
  );
}
