import { useEffect, useRef, useState } from "react";
import { BatteryFull, Signal, Wifi } from "lucide-react";
import type { FrameKind } from "../../lib/types";
import { LIGHT, MONO, useTheme } from "../../lib/theme";

// The device status bar shows the REAL current time (not a frozen 9:41), refreshed
// often enough to roll over the minute. iOS-style: hour without a leading zero.
function useClock(): string {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 15000);
    return () => clearInterval(t);
  }, []);
  return `${now.getHours()}:${String(now.getMinutes()).padStart(2, "0")}`;
}

interface Props {
  frame: FrameKind;
  url: string;
  title: string;
  /** Colour painted into the phone safe areas (status bar + home indicator);
   *  defaults to white. Status-bar contents auto-contrast against it. */
  safeArea?: string;
  /** Show the device chrome (iOS-style status bar + notch + home indicator) as an
   *  OVERLAY on phone frames. Default true. The content is always full-screen
   *  (edge-to-edge, no safe-area bands); the chrome floats on top with the real time.
   *  Set false to hide it entirely. */
  chrome?: boolean;
  /** Ref onto the device's outer element so the snapshot can capture the WHOLE
   *  framed device (bezel + chrome + content), not just the iframe body. */
  rootRef?: React.Ref<HTMLDivElement>;
  children: React.ReactNode;
}

const BEZEL = "#0b0b0c";

// Is this CSS colour dark enough to want light status-bar contents on top? Uses a
// throwaway canvas to normalise ANY CSS colour (hex/rgb/hsl/named) to rgb, then
// measures relative luminance. Defaults to "light" (dark text) on anything odd.
function isDarkColor(color: string): boolean {
  try {
    const ctx = document.createElement("canvas").getContext("2d");
    if (!ctx) return false;
    ctx.fillStyle = "#ffffff";
    ctx.fillStyle = color; // invalid input leaves the previous (white) value
    const norm = ctx.fillStyle as string;
    let r = 255,
      g = 255,
      b = 255;
    if (norm[0] === "#") {
      const h = norm.length === 4 ? norm.slice(1).replace(/./g, "$&$&") : norm.slice(1);
      r = parseInt(h.slice(0, 2), 16);
      g = parseInt(h.slice(2, 4), 16);
      b = parseInt(h.slice(4, 6), 16);
    } else {
      const m = norm.match(/rgba?\(([^)]+)\)/);
      if (m) {
        const p = m[1].split(",").map((s) => parseFloat(s));
        [r, g, b] = p;
      }
    }
    return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 < 0.5;
  } catch {
    return false;
  }
}

// Wraps the freeform iframe in a believable device frame so the same HTML can be
// previewed as desktop web, a native desktop app, or an iOS / Android phone.
export function DeviceFrame({ frame, url, title, safeArea, chrome = true, rootRef, children }: Props) {
  if (frame === "ios")
    return (
      <IosFrame title={title} safeArea={safeArea} chrome={chrome} rootRef={rootRef}>
        {children}
      </IosFrame>
    );
  if (frame === "android")
    return (
      <AndroidFrame title={title} safeArea={safeArea} chrome={chrome} rootRef={rootRef}>
        {children}
      </AndroidFrame>
    );
  if (frame === "ipad")
    return (
      <IpadFrame title={title} safeArea={safeArea} chrome={chrome} rootRef={rootRef}>
        {children}
      </IpadFrame>
    );
  if (frame === "desktop") return <DesktopFrame title={title} rootRef={rootRef}>{children}</DesktopFrame>;
  return <WebFrame url={url} rootRef={rootRef}>{children}</WebFrame>;
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

// A web / desktop preview is a REAL browser window: it lays the page out at a true desktop
// width and is only scaled to fit the canvas visually. Before this, the web frame just filled
// the (usually narrow) canvas, so the page's media queries saw that cramped width and a
// responsive nav collapsed to its mobile hamburger in Arta — while a real browser at the same
// screen showed the desktop nav. The transform is visual only, so the iframe still lays out at
// `layoutWidth` and its md:/lg:/xl: breakpoints fire exactly as in a ~1280px browser.
const WEB_LAYOUT_W = 1280;

function BrowserWindow({
  chromeBar,
  rootRef,
  children,
  layoutWidth = WEB_LAYOUT_W,
}: {
  chromeBar: React.ReactNode;
  rootRef?: React.Ref<HTMLDivElement>;
  children: React.ReactNode;
  layoutWidth?: number;
}) {
  const { c } = useTheme();
  const outerRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: layoutWidth, h: 800 });
  useEffect(() => {
    const el = outerRef.current;
    if (!el) return;
    const measure = () => setBox({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const scale = Math.min(1, box.w / layoutWidth); // only ever shrink — never blow a small page up
  const innerH = scale > 0 ? box.h / scale : box.h; // unscaled height that fills the canvas after scaling
  const offsetX = Math.max(0, (box.w - layoutWidth * scale) / 2); // centre the scaled window

  return (
    <div ref={outerRef} className="relative h-full w-full overflow-hidden">
      <div
        ref={rootRef}
        className="absolute top-0 flex flex-col overflow-hidden rounded-[12px]"
        style={{
          left: offsetX,
          width: layoutWidth,
          height: innerH,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          background: LIGHT.bg,
          border: `1px solid ${c.border}`,
        }}
      >
        {chromeBar}
        <div className="min-h-0 flex-1">{children}</div>
      </div>
    </div>
  );
}

function WebFrame({ url, rootRef, children }: { url: string; rootRef?: React.Ref<HTMLDivElement>; children: React.ReactNode }) {
  const chromeBar = (
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
  );
  return <BrowserWindow chromeBar={chromeBar} rootRef={rootRef}>{children}</BrowserWindow>;
}

function DesktopFrame({ title, rootRef, children }: { title: string; rootRef?: React.Ref<HTMLDivElement>; children: React.ReactNode }) {
  const chromeBar = (
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
  );
  return <BrowserWindow chromeBar={chromeBar} rootRef={rootRef}>{children}</BrowserWindow>;
}

// Shared phone / tablet shell: dark bezel + rounded screen, sized to fit the canvas.
// `maxH` caps the height so the device keeps a believable aspect — phones stay ~820,
// the taller tablet (iPad portrait) gets more room before the canvas height clamps it.
function Phone({
  radius,
  screenRadius,
  pad,
  width,
  maxH = 820,
  screenBg,
  statusBar,
  bottom,
  rootRef,
  children,
}: {
  radius: number;
  screenRadius: number;
  pad: number;
  width: number;
  maxH?: number;
  screenBg: string;
  statusBar: React.ReactNode;
  bottom: React.ReactNode;
  rootRef?: React.Ref<HTMLDivElement>;
  children: React.ReactNode;
}) {
  return (
    <div
      ref={rootRef}
      className="relative flex flex-col"
      style={{
        width,
        height: `min(${maxH}px, 100%)`,
        background: BEZEL,
        borderRadius: radius,
        padding: pad,
        boxShadow: "0 30px 70px rgba(0,0,0,.55)",
      }}
    >
      {/* Full-screen: the content fills the WHOLE screen (edge-to-edge, no safe-area
          bands). The status bar + home indicator are absolute overlays painted ON TOP
          of it, like a real iOS app. screenBg shows only where content doesn't reach. */}
      <div
        className="relative flex min-h-0 flex-1 flex-col overflow-hidden"
        style={{ background: screenBg, borderRadius: screenRadius }}
      >
        <div className="relative min-h-0 flex-1">{children}</div>
        {statusBar}
        {bottom}
      </div>
    </div>
  );
}

function StatusIcons({ color }: { color: string }) {
  return (
    <div className="flex items-center gap-1.5" style={{ color }}>
      <Signal size={14} />
      <Wifi size={14} />
      <BatteryFull size={18} />
    </div>
  );
}

function IosFrame({
  safeArea,
  chrome = true,
  rootRef,
  children,
}: {
  title: string;
  safeArea?: string;
  chrome?: boolean;
  rootRef?: React.Ref<HTMLDivElement>;
  children: React.ReactNode;
}) {
  const dark = safeArea ? isDarkColor(safeArea) : false;
  const fg = dark ? "#f5f5f7" : LIGHT.fg;
  const time = useClock();
  return (
    <Phone
      rootRef={rootRef}
      width={384}
      radius={52}
      screenRadius={42}
      pad={11}
      screenBg={safeArea || LIGHT.bg}
      // Status bar + notch overlay (real time), floating over the full-screen content.
      statusBar={
        chrome ? (
          <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex h-11 items-center justify-between px-7 pt-1">
            <span className="text-[14px] font-semibold" style={{ color: fg }}>
              {time}
            </span>
            {/* Dynamic Island — a physical cutout, always black */}
            <span className="absolute left-1/2 top-2 h-[26px] w-[96px] -translate-x-1/2 rounded-full bg-black" />
            <StatusIcons color={fg} />
          </div>
        ) : null
      }
      bottom={
        chrome ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex h-6 items-end justify-center pb-2">
            <span
              className="h-[5px] w-[134px] rounded-full"
              style={{ background: dark ? "rgba(255,255,255,.85)" : "rgba(0,0,0,.85)" }}
            />
          </div>
        ) : null
      }
    >
      {children}
    </Phone>
  );
}

function AndroidFrame({
  safeArea,
  chrome = true,
  rootRef,
  children,
}: {
  title: string;
  safeArea?: string;
  chrome?: boolean;
  rootRef?: React.Ref<HTMLDivElement>;
  children: React.ReactNode;
}) {
  const dark = safeArea ? isDarkColor(safeArea) : false;
  const fg = dark ? "#f5f5f7" : LIGHT.fg;
  const time = useClock();
  return (
    <Phone
      rootRef={rootRef}
      width={392}
      radius={40}
      screenRadius={30}
      pad={9}
      screenBg={safeArea || LIGHT.bg}
      statusBar={
        chrome ? (
          <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex h-8 items-center justify-between px-4">
            <span className="text-[12px] font-medium" style={{ color: fg }}>
              {time}
            </span>
            {/* punch-hole camera — a physical cutout, always black */}
            <span className="absolute left-1/2 top-2.5 h-3 w-3 -translate-x-1/2 rounded-full bg-black" />
            <div className="flex items-center gap-1.5" style={{ color: fg }}>
              <Signal size={13} />
              <Wifi size={13} />
              <BatteryFull size={16} />
            </div>
          </div>
        ) : null
      }
      bottom={
        chrome ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex h-6 items-center justify-center pb-1.5">
            <span
              className="h-[4px] w-[118px] rounded-full"
              style={{ background: dark ? "rgba(255,255,255,.5)" : "rgba(0,0,0,.55)" }}
            />
          </div>
        ) : null
      }
    >
      {children}
    </Phone>
  );
}

// Tablet shell (iPad portrait): a uniform slim bezel, gently rounded corners, and —
// unlike the phones — NO notch / Dynamic Island (just a status bar). Renders the page
// at a tablet width so `md:` / `lg:` breakpoints kick in. Same as the phones: the
// content is full-screen and the status bar / home indicator overlay on top.
function IpadFrame({
  safeArea,
  chrome = true,
  rootRef,
  children,
}: {
  title: string;
  safeArea?: string;
  chrome?: boolean;
  rootRef?: React.Ref<HTMLDivElement>;
  children: React.ReactNode;
}) {
  const dark = safeArea ? isDarkColor(safeArea) : false;
  const fg = dark ? "#f5f5f7" : LIGHT.fg;
  const time = useClock();
  return (
    <Phone
      rootRef={rootRef}
      width={810}
      maxH={1120}
      radius={30}
      screenRadius={18}
      pad={16}
      screenBg={safeArea || LIGHT.bg}
      statusBar={
        chrome ? (
          <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex h-8 items-center justify-between px-6 pt-1">
            <span className="text-[13px] font-semibold" style={{ color: fg }}>
              {time}
            </span>
            <StatusIcons color={fg} />
          </div>
        ) : null
      }
      bottom={
        chrome ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex h-6 items-end justify-center pb-2">
            <span
              className="h-[5px] w-[180px] rounded-full"
              style={{ background: dark ? "rgba(255,255,255,.85)" : "rgba(0,0,0,.85)" }}
            />
          </div>
        ) : null
      }
    >
      {children}
    </Phone>
  );
}
