"use client";

import { useEffect, useRef } from "react";

export interface GraphNode {
  id: string;
  type: "candidate" | "company" | "family" | "politician" | "donor";
  label: string;
  detail: string;
  source?: "declared" | "reported" | "alleged";
  link?: string | null;
  confidence?: "confirmed" | "medium" | "low";
}

export interface GraphEdge {
  from: string;
  to: string;
  label: string;
}

export interface RedFlag {
  text: string;
  link?: string | null;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  summary: string;
  red_flags: (string | RedFlag)[];
  cached?: boolean;
  generated_at?: string;
}

const NODE_COLORS: Record<GraphNode["type"], { bg: string; border: string; text: string }> = {
  candidate:  { bg: "#c0392b", border: "#922b21", text: "#fff" },
  company:    { bg: "#2471a3", border: "#1a5276", text: "#fff" },
  family:     { bg: "#1e8449", border: "#145a32", text: "#fff" },
  politician: { bg: "#6c3483", border: "#512e5f", text: "#fff" },
  donor:      { bg: "#d35400", border: "#a04000", text: "#fff" },
};

const TYPE_LABELS: Record<GraphNode["type"], string> = {
  candidate:  "Candidate",
  company:    "Company",
  family:     "Family",
  politician: "Politician",
  donor:      "Donor",
};

const SOURCE_BADGE: Record<string, { label: string; bg: string; text: string }> = {
  declared: { label: "✓ Declared",  bg: "#dcfce7", text: "#166534" },
  reported: { label: "⚠ Reported",  bg: "#fef9c3", text: "#854d0e" },
  alleged:  { label: "? Alleged",   bg: "#f3f4f6", text: "#6b7280" },
};

function RadialGraph({ nodes, edges }: { nodes: GraphNode[]; edges: GraphEdge[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    const centerX = W / 2;
    const centerY = H / 2;
    const radius = Math.min(W, H) * 0.36;

    const positions: Record<string, { x: number; y: number }> = {};
    const others = nodes.filter((n) => n.id !== "c0");

    positions["c0"] = { x: centerX, y: centerY };
    others.forEach((node, i) => {
      const angle = (2 * Math.PI * i) / others.length - Math.PI / 2;
      positions[node.id] = {
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
      };
    });

    // Draw edges
    ctx.lineWidth = 1.5;
    edges.forEach((edge) => {
      const from = positions[edge.from];
      const to = positions[edge.to];
      if (!from || !to) return;

      ctx.beginPath();
      ctx.strokeStyle = "#cbd5e1";
      ctx.setLineDash([4, 4]);
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();
      ctx.setLineDash([]);

      const mx = (from.x + to.x) / 2;
      const my = (from.y + to.y) / 2;
      ctx.font = "10px Inter, sans-serif";
      ctx.fillStyle = "#94a3b8";
      ctx.textAlign = "center";
      ctx.fillText(edge.label, mx, my - 4);
    });

    // Draw nodes
    nodes.forEach((node) => {
      const pos = positions[node.id];
      if (!pos) return;
      const colors = NODE_COLORS[node.type];
      const r = node.id === "c0" ? 36 : 28;
      const isReported = node.source === "reported" || node.source === "alleged";

      // Shadow
      ctx.shadowColor = "rgba(0,0,0,0.15)";
      ctx.shadowBlur = 8;

      // Circle fill
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, r, 0, 2 * Math.PI);
      ctx.fillStyle = isReported ? colors.bg + "cc" : colors.bg;
      ctx.fill();

      // Border: solid for declared, dashed for reported/alleged
      ctx.shadowBlur = 0;
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = colors.border;
      if (isReported) {
        ctx.setLineDash([5, 3]);
      }
      ctx.stroke();
      ctx.setLineDash([]);

      // Label inside
      ctx.font = node.id === "c0" ? "bold 11px Inter, sans-serif" : "bold 10px Inter, sans-serif";
      ctx.fillStyle = colors.text;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const short = node.label.split(" ")[0];
      ctx.fillText(short.length > 9 ? short.slice(0, 8) + "…" : short, pos.x, pos.y);

      // Label below node
      ctx.font = "11px Inter, sans-serif";
      ctx.fillStyle = "#1e293b";
      ctx.textBaseline = "top";
      const words = node.label.split(" ");
      const line1 = words.slice(0, 2).join(" ");
      const line2 = words.slice(2).join(" ");
      ctx.fillText(line1.length > 14 ? line1.slice(0, 13) + "…" : line1, pos.x, pos.y + r + 4);
      if (line2) {
        ctx.font = "10px Inter, sans-serif";
        ctx.fillStyle = "#64748b";
        ctx.fillText(line2.length > 14 ? line2.slice(0, 13) + "…" : line2, pos.x, pos.y + r + 17);
      }
    });
  }, [nodes, edges]);

  return (
    <canvas
      ref={canvasRef}
      width={500}
      height={400}
      className="w-full max-w-xl mx-auto"
      style={{ maxHeight: 400 }}
    />
  );
}

function normaliseRedFlag(flag: string | RedFlag): RedFlag {
  if (typeof flag === "string") return { text: flag, link: null };
  return flag;
}

export default function ConnectionGraph({ data }: { data: GraphData }) {
  const { nodes, edges, summary, red_flags } = data;

  const legend = [
    { type: "company"   as const, label: "Company / Business" },
    { type: "family"    as const, label: "Family Member" },
    { type: "politician"as const, label: "Connected Politician" },
    { type: "donor"     as const, label: "Electoral Donor" },
  ];

  return (
    <div className="space-y-4">
      {/* Summary */}
      {summary && (
        <p className="text-sm text-gray-600 leading-relaxed">{summary}</p>
      )}

      {/* Source legend */}
      <div className="flex flex-wrap gap-3 text-[11px]">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-full border-2 border-gray-400 bg-gray-200" />
          <span className="text-gray-500">Solid border = Officially declared</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-full border-2 border-dashed border-gray-400 bg-gray-100" />
          <span className="text-gray-500">Dashed = Reported in news</span>
        </span>
      </div>

      {/* Red flags */}
      {red_flags && red_flags.length > 0 && (
        <div className="space-y-2">
          {red_flags.map((flag, i) => {
            const { text, link } = normaliseRedFlag(flag);
            return (
              <div key={i} className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
                <span className="text-red-500 mt-0.5 flex-shrink-0">⚑</span>
                <p className="text-xs text-red-700 font-medium flex-1">{text}</p>
                {link && (
                  <a
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] text-red-400 hover:text-red-600 underline flex-shrink-0 mt-0.5"
                  >
                    Source ↗
                  </a>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Graph */}
      {nodes.length > 1 ? (
        <div className="bg-gray-50 rounded-2xl p-3 border border-gray-100">
          <RadialGraph nodes={nodes} edges={edges} />
        </div>
      ) : (
        <div className="text-center py-8 text-gray-400 text-sm">
          No connections found in public records
        </div>
      )}

      {/* Connection list */}
      {nodes.filter((n) => n.id !== "c0").length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Connections Found</p>
          {nodes.filter((n) => n.id !== "c0").map((node) => {
            const colors = NODE_COLORS[node.type];
            const srcKey = node.source ?? "declared";
            const badge = SOURCE_BADGE[srcKey] ?? SOURCE_BADGE.declared;
            return (
              <div key={node.id} className="flex items-center gap-3 bg-white border border-gray-100 rounded-xl px-3 py-2.5">
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ background: colors.bg }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{node.label}</p>
                  <p className="text-xs text-gray-400 truncate">{node.detail}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {/* Source badge */}
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{ background: badge.bg, color: badge.text }}
                  >
                    {badge.label}
                  </span>
                  {/* Confidence badge — only show for low confidence to warn user */}
                  {node.confidence === "low" && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700"
                      title="Name match only — may not be the same person. Verify before sharing.">
                      ⚠ Unverified
                    </span>
                  )}
                  {/* Type badge */}
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{ background: colors.bg + "20", color: colors.bg }}
                  >
                    {TYPE_LABELS[node.type]}
                  </span>
                  {/* Source link */}
                  {node.link && (
                    <a
                      href={node.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-gray-400 hover:text-gray-600"
                      title="View source"
                    >
                      ↗
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Node type legend */}
      <div className="flex flex-wrap gap-2 pt-1">
        {legend.map((l) => (
          <div key={l.type} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: NODE_COLORS[l.type].bg }} />
            <span className="text-[10px] text-gray-500">{l.label}</span>
          </div>
        ))}
      </div>

      {/* Data disclaimer */}
      <p className="text-[10px] text-gray-400 leading-relaxed border-t border-gray-100 pt-2">
        Sources: ECI affidavit (declared) · News reports (reported). Undisclosed informal networks cannot be detected by any automated system.
      </p>

      {data.cached && data.generated_at && (
        <p className="text-[10px] text-gray-400">
          Cached · Generated {new Date(data.generated_at).toLocaleDateString("en-IN")}
        </p>
      )}
    </div>
  );
}
