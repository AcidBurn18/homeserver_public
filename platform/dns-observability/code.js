const frames = context.panel.data.series || [];

function readFieldValue(field) {
  if (!field || !field.values) return 0;

  const values = field.values;
  const length = values.length ?? values.buffer?.length ?? 0;
  if (!length) return 0;

  let raw;
  if (values.get) raw = values.get(length - 1);
  else if (values.toArray) raw = values.toArray()[length - 1];
  else if (values.buffer) raw = values.buffer[length - 1];
  else raw = values[length - 1];

  return Number(raw) || 0;
}

function getValueByIndex(index) {
  const frame = frames[index];
  if (!frame) return 0;

  const numberField = frame.fields.find((f) => f.type === "number");
  if (!numberField) return 0;

  return Math.max(0, Math.round(readFieldValue(numberField)));
}

function fmt(value) {
  if (value >= 1000000) return (value / 1000000).toFixed(1) + "M";
  if (value >= 1000) return (value / 1000).toFixed(1) + "K";
  return String(Math.round(value));
}

/*
Query order:
A = AdGuard Total
B = AdGuard Blocked
C = AdGuard Allowed
D = AdGuard Cache Hit
E = AdGuard Forwarded / Non-Cached
F = Unbound Cache Hits Raw
G = Unbound Cache Miss Raw
H = Avg Recursion ms
*/

const adguardTotal = getValueByIndex(0);
const adguardBlocked = getValueByIndex(1);
const adguardAllowed = getValueByIndex(2);
const adguardCacheHits = getValueByIndex(3);
const adguardForwarded = getValueByIndex(4);
const rawUnboundHits = getValueByIndex(5);
const rawUnboundMisses = getValueByIndex(6);
const recursionMs = getValueByIndex(7);

const rawUnboundTotal = rawUnboundHits + rawUnboundMisses;

let normalizedUnboundHits = 0;
let normalizedUnboundMisses = 0;

if (rawUnboundTotal > 0 && adguardForwarded > 0) {
  normalizedUnboundHits = Math.round(adguardForwarded * rawUnboundHits / rawUnboundTotal);
  normalizedUnboundMisses = Math.max(0, adguardForwarded - normalizedUnboundHits);
}

const blockPercent = adguardTotal > 0
  ? Math.round((adguardBlocked / adguardTotal) * 100)
  : 0;

const allowPercent = adguardTotal > 0
  ? 100 - blockPercent
  : 0;

const adguardCachePercent = adguardAllowed > 0
  ? Math.round((adguardCacheHits / adguardAllowed) * 100)
  : 0;

const forwardedPercent = adguardAllowed > 0
  ? 100 - adguardCachePercent
  : 0;

const unboundHitPercent = rawUnboundTotal > 0
  ? Math.round((rawUnboundHits / rawUnboundTotal) * 100)
  : 0;

const unboundMissPercent = rawUnboundTotal > 0
  ? 100 - unboundHitPercent
  : 0;

/*
Visible node names.
Change names here if you want different labels.
*/

const nodeClient = `Client Devices\n${fmt(adguardTotal)}`;
const nodeAdGuard = `AdGuard DNS\n${fmt(adguardTotal)}`;
const nodeBlocked = `Blocked by AdGuard\n${fmt(adguardBlocked)} (${blockPercent}%)`;
const nodeCache = `AdGuard Cache Hit\n${fmt(adguardCacheHits)} (${adguardCachePercent}%)`;
const nodeForwarded = `Forwarded to Unbound\n${fmt(adguardForwarded)} (${forwardedPercent}%)`;
const nodeUnbound = `Unbound Resolver\n${fmt(adguardForwarded)}`;
const nodeUnboundHit = `Unbound Cache Hit\n${fmt(normalizedUnboundHits)} (${unboundHitPercent}%)`;
const nodeUnboundMiss = `Unbound Cache Miss\n${fmt(normalizedUnboundMisses)} (${unboundMissPercent}%)`;
const nodeInternet = `Recursive Internet DNS\n${fmt(recursionMs)} ms avg`;

const nodes = [
  {
    name: nodeClient,
    itemStyle: { color: "#64748b" }
  },
  {
    name: nodeAdGuard,
    itemStyle: { color: "#10b981" }
  },
  {
    name: nodeBlocked,
    itemStyle: { color: "#ef4444" }
  },
  {
    name: nodeCache,
    itemStyle: { color: "#06b6d4" }
  },
  {
    name: nodeForwarded,
    itemStyle: { color: "#3b82f6" }
  },
  {
    name: nodeUnbound,
    itemStyle: { color: "#8b5cf6" }
  },
  {
    name: nodeUnboundHit,
    itemStyle: { color: "#84cc16" }
  },
  {
    name: nodeUnboundMiss,
    itemStyle: { color: "#f59e0b" }
  },
  {
    name: nodeInternet,
    itemStyle: { color: "#94a3b8" }
  }
];

const links = [
  {
    source: nodeClient,
    target: nodeAdGuard,
    value: adguardTotal,
    lineStyle: { color: "#64748b" }
  },
  {
    source: nodeAdGuard,
    target: nodeBlocked,
    value: adguardBlocked,
    lineStyle: { color: "#ef4444" }
  },
  {
    source: nodeAdGuard,
    target: nodeCache,
    value: adguardCacheHits,
    lineStyle: { color: "#06b6d4" }
  },
  {
    source: nodeAdGuard,
    target: nodeForwarded,
    value: adguardForwarded,
    lineStyle: { color: "#3b82f6" }
  },
  {
    source: nodeForwarded,
    target: nodeUnbound,
    value: adguardForwarded,
    lineStyle: { color: "#8b5cf6" }
  },
  {
    source: nodeUnbound,
    target: nodeUnboundHit,
    value: normalizedUnboundHits,
    lineStyle: { color: "#84cc16" }
  },
  {
    source: nodeUnbound,
    target: nodeUnboundMiss,
    value: normalizedUnboundMisses,
    lineStyle: { color: "#f59e0b" }
  },
  {
    source: nodeUnboundMiss,
    target: nodeInternet,
    value: normalizedUnboundMisses,
    lineStyle: { color: "#94a3b8" }
  }
].filter((link) => link.value > 0);

return {
  backgroundColor: "transparent",

  title: {
    text: "🌐 DNS Flow — AdGuard → Unbound",
    subtext:
      `Total ${fmt(adguardTotal)}  •  Blocked ${fmt(adguardBlocked)} (${blockPercent}%)  •  AdGuard Cache ${fmt(adguardCacheHits)} (${adguardCachePercent}%)  •  Forwarded ${fmt(adguardForwarded)}  •  Unbound Cache Hit ${unboundHitPercent}%`,
    left: "center",
    top: 8,
    textStyle: {
      fontSize: 20,
      fontWeight: 800,
      color: "#e5e7eb"
    },
    subtextStyle: {
      fontSize: 12,
      color: "#9ca3af"
    }
  },

  tooltip: {
    trigger: "item",
    triggerOn: "mousemove",
    backgroundColor: "rgba(15, 23, 42, 0.96)",
    borderColor: "#334155",
    borderWidth: 1,
    textStyle: {
      color: "#e5e7eb",
      fontSize: 12
    },
    formatter: function (params) {
      if (params.dataType === "edge") {
        return `
          <div style="font-weight:700;margin-bottom:4px;">DNS Flow</div>
          <div>${params.data.source.replace("\n", " ")}</div>
          <div style="color:#94a3b8;">↓</div>
          <div>${params.data.target.replace("\n", " ")}</div>
          <hr style="border:0;border-top:1px solid #334155;margin:6px 0;" />
          <div><b>${fmt(params.data.value)}</b> queries</div>
        `;
      }

      return `
        <div style="font-weight:700;">${params.name.replace("\n", "<br/>")}</div>
      `;
    }
  },

  series: [
    {
      type: "sankey",

      top: 95,
      left: 35,
      right: 45,
      bottom: 35,

      nodeGap: 24,
      nodeWidth: 26,
      nodeAlign: "justify",
      layoutIterations: 64,
      draggable: true,

      emphasis: {
        focus: "adjacency",
        blurScope: "coordinateSystem"
      },

      label: {
        color: "#e5e7eb",
        fontSize: 13,
        fontWeight: 700,
        lineHeight: 18
      },

      lineStyle: {
        color: "gradient",
        curveness: 0.55,
        opacity: 0.42
      },

      itemStyle: {
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.18)",
        shadowBlur: 12,
        shadowColor: "rgba(0,0,0,0.35)"
      },

      data: nodes,
      links: links
    }
  ],

  graphic: [
    {
      type: "text",
      left: 20,
      bottom: 12,
      style: {
        text: "AdGuard = filtering/cache layer  •  Unbound = recursive resolver/cache layer",
        fill: "#94a3b8",
        font: "12px sans-serif"
      }
    }
  ]
};