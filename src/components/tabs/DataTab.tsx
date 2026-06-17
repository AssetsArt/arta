import { Link2, Table as TableIcon } from "lucide-react";
import type { DataModel, Entity } from "../../lib/types";
import { MONO, useTheme } from "../../lib/theme";
import { Card, SectionHead, Tag } from "../ui/panel";

export function DataTab({ dataModel }: { dataModel: DataModel }) {
  const { c } = useTheme();

  const entityCard = (ent: Entity, i: number) => (
    <div
      key={i}
      className="w-[262px] self-start overflow-hidden rounded-[10px]"
      style={{ background: c.card, border: `1px solid ${c.border}` }}
    >
      <div
        className="flex items-center gap-2 border-b px-3.5 py-2.5 text-[13px] font-semibold"
        style={{ borderColor: c.border, background: c.panel2, fontFamily: MONO, color: c.text }}
      >
        <TableIcon size={14} color={c.accent} />
        {ent.name}
      </div>
      {(ent.fields || []).map((f, fi) => (
        <div
          key={fi}
          className="flex items-center gap-2 px-3.5 py-[7px] text-[12.5px]"
          style={{ borderTop: fi ? `1px solid ${c.borderSoft}` : "none", fontFamily: MONO }}
        >
          <span
            className="h-1.5 w-1.5 shrink-0 rounded-full"
            title={f.required ? "required" : "optional"}
            style={{
              background: f.required ? c.amber : "transparent",
              border: f.required ? "none" : `1px solid ${c.border}`,
            }}
          />
          <span className="flex-1" style={{ color: c.text }}>
            {f.name}
          </span>
          <div className="flex items-center gap-1.5">
            {f.pk && <Tag label="PK" color={c.yellow} />}
            {f.fk && <Tag label="FK" color={c.accent} />}
            <span style={{ color: c.dim }}>{f.type}</span>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="mx-auto flex max-w-[1000px] flex-col gap-[18px]">
      <div className="flex flex-wrap gap-4">{(dataModel.entities || []).map(entityCard)}</div>
      <Card>
        <SectionHead label="Relationships" Icon={Link2} />
        <div className="flex flex-col gap-[11px]">
          {(dataModel.relationships || []).map((r, i) => (
            <div key={i} className="flex flex-wrap items-center gap-[9px] text-[13px]" style={{ fontFamily: MONO }}>
              <span style={{ color: c.text }}>{r.from}</span>
              <span style={{ color: c.accent }}>{`—(${r.type})→`}</span>
              <span style={{ color: c.text }}>{r.to}</span>
              {r.label && <span style={{ color: c.faint }}>: {r.label}</span>}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
