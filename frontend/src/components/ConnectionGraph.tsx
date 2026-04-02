"use client";

import { useEffect, useRef } from "react";

export interface GraphNode {
  id: string;
  type: "candidate" | "company" | "family" | "politician" | "donor";
  label: string;
  detail: string;
}

export interface GraphEdge {
  from: string;
  to: string;
  label: string;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  summary: string;
  red_flags: string[];
  cached?: boolean;
  generated_at?: string;
}

const NODE_COLORS: Record<GraphNode["type"], { bg: string; border: string; text: string }> = {
  candidate: { bg: "#c0392b", border: "#922b21", text: "#fff" },
  company:   { bg: "#2471a3", border: "#1a5276", text: "#fff" },
  family:    { bg: "#1e8449", border: "#145a32", text: "#fff" },
  politician:{ bg: "#6c3483", border: "#512e5f", text: "#fff" },
  donor:     { bg: "#d35400", border: "#a04000", text: "#fff" },
};

const TYPE_LABELS: Record<GraphNode["type"], string> = {
  candidate:  "You",
  company:    "Company",
  family:     "Family",
  politician: "Politician",
  donor:      "Donor",
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

    // Position nodes: candidate in center, others in a circle
    const centerX = W / 2;
    const centerY = H / 2;
    const radius = Math.min(W, H) * 0.36;

    const positions: Record<string, { x: number; y: number }> = {};
    const others = nodes.filter((n) => n.id !== "c0");
    const candidateNode = nodes.find((n) => n.id === "c0");

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

      // Edge label at midpoint
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

      // Shadow
      ctx.shadowColor = "rgba(0,0,0,0.15)";
      ctx.shadowBlur = 8;

      // Circle
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, r, 0, 2 * Math.PI);
      ctx.fillStyle = colors.bg;
      ctx.fill();
      ctx.strokeStyle = colors.border;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Label inside node (first word only if too long)
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

export default function ConnectionGraph({ data }: { data: GraphData }) {
  const { nodes, edges, summary, red_flags } = data;

  const legend = [
    { type: "company" as const, label: "Company / Business" },
    { type: "family" as const, label: "Family Member" },
    { type: "politician" as const, label: "Connected Politician" },
    { type: "donor" as const, label: "Electoral Donor" },
  ];

  return (
    <div className="space-y-4">
      {/* Summary */}
      {summary && (
        <p className="text-sm text-gray-600 leading-relaxed">{summary}</p>
      )}

      {/* Red flags */}
      {red_flags && red_flags.length > 0 && (
        <div className="space-y-2">
          {red_flags.map((flag, i) => (
            <div key={i} className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
              <span className="text-red-500 mt-0.5 flex-shrink-0">⚑</span>
              <p className="text-xs text-red-700 font-medium">{flag}</p>
            </div>
          ))}
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

      {/* Node list */}
      {nodes.filter((n) => n.id !== "c0").length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Connections Found</p>
          {nodes.filter((n) => n.id !== "c0").map((node) => {
            const colors = NODE_COLORS[node.type];
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
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                  style={{ background: colors.bg + "20", color: colors.bg }}
                >
                  {TYPE_LABELS[node.type]}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-2 pt-1">
        {legend.map((l) => (
          <div key={l.type} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: NODE_COLORS[l.type].bg }} />
            <span className="text-[10px] text-gray-500">{l.label}</span>
          </div>
        ))}
      </div>

      {data.cached && data.generated_at && (
        <p className="text-[10px] text-gray-400">
          Cached · Generated {new Date(data.generated_at).toLocaleDateString("en-IN")}
        </p>
      )}
    </div>
  );
}
