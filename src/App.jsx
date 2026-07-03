import { useState, useEffect } from "react";

const WATCHLIST = [
  { name: "Automattic", url: "https://automattic.com/work-with-us", tier: "confirmed" },
  { name: "Doist", url: "https://doist.com/careers", tier: "confirmed" },
  { name: "Buffer", url: "https://buffer.com/journey", tier: "confirmed" },
  { name: "Toggl", url: "https://toggl.com/jobs", tier: "confirmed" },
  { name: "Superside", url: "https://jobs.lever.co/superside", tier: "confirmed" },
  { name: "TestGorilla", url: "https://testgorilla.com/careers", tier: "confirmed" },
  { name: "Hubstaff", url: "https://jobs.ashbyhq.com/hubstaff", tier: "confirmed" },
  { name: "SafetyWing", url: "https://safetywing.pinpointhq.com", tier: "confirmed" },
  { name: "Remote.com", url: "https://remote.com/openings", tier: "confirmed" },
  { name: "GitLab", url: "https://about.gitlab.com/jobs", tier: "confirmed" },
  { name: "Shogun", url: "https://getshogun.com/careers-apply", tier: "confirmed" },
  { name: "Help Scout", url: "https://helpscout.com/company/careers", tier: "monitor" },
  { name: "Customer.io", url: "https://customer.io/careers", tier: "monitor" },
  { name: "Zapier", url: "https://zapier.com/jobs", tier: "monitor" },
  { name: "MailerLite", url: "https://mailerlite.com/jobs", tier: "monitor" },
  { name: "Kit/ConvertKit", url: "https://kit.com/careers", tier: "monitor" },
  { name: "Lyssna", url: "https://lyssna.com/careers", tier: "monitor" },
  { name: "ChartMogul", url: "https://chartmogul.com/careers", tier: "monitor" },
  { name: "Ghost", url: "https://careers.ghost.org", tier: "monitor" },
  { name: "Chameleon", url: "https://chameleon.io/jobs", tier: "monitor" },
  { name: "PostHog", url: "https://posthog.com/careers", tier: "monitor" },
  { name: "RevenueCat", url: "https://job-boards.greenhouse.io/revenuecat", tier: "monitor" },
  { name: "Webflow", url: "https://webflow.com/careers/roles", tier: "monitor" },
  { name: "Openphone", url: "https://openphone.com/careers", tier: "monitor" },
];

const WATCHLIST_TIER = new Map(WATCHLIST.map((w) => [w.name.toLowerCase(), w.tier]));
const BOARD_SOURCES = new Set(["We Work Remotely", "Remote OK"]);

const STATUS_OPTIONS = ["Not Applied", "Applied", "Interviewing", "Offer", "Rejected"];

const STATUS_COLORS = {
  "Not Applied": { bg: "rgba(142,142,147,0.1)",  text: "#6C6C70", dot: "#AEAEB2" },
  "Applied":     { bg: "rgba(0,122,255,0.1)",    text: "#007AFF", dot: "#007AFF" },
  "Interviewing":{ bg: "rgba(255,149,0,0.1)",    text: "#C07800", dot: "#FF9500" },
  "Offer":       { bg: "rgba(52,199,89,0.1)",    text: "#248A3D", dot: "#34C759" },
  "Rejected":    { bg: "rgba(255,59,48,0.1)",    text: "#C0392B", dot: "#FF3B30" },
};

// ─── Data transformation helpers (unchanged) ────────────────────────────────

function formatDate(val) {
  if (!val) return "";
  const d = new Date(typeof val === "number" ? val * 1000 : val);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-AU", { day: "numeric", month: "short" });
}

function shortSource(source) {
  if (source === "We Work Remotely") return "WWR";
  if (source === "Remote OK") return "RemoteOK";
  return null;
}

function transformGeoSignals(signals) {
  if (!Array.isArray(signals)) return { positive: [], negative: [] };
  const positive = [];
  const negative = [];
  for (const s of signals) {
    if (s.type === "pass") {
      positive.push("no geo restrictions");
    } else if (s.type === "info") {
      const loc = s.label.replace("Location listed as:", "").trim();
      if (loc && loc.toLowerCase() !== "remote") positive.push(loc);
    } else if (s.type === "region") {
      const regions = s.label.replace("May be region-scoped — title/location mentions:", "").trim();
      negative.push(`region: ${regions}`);
    }
  }
  return { positive, negative };
}

function normalizeJob(job) {
  const isBoard = BOARD_SOURCES.has(job.source);
  const tier = isBoard
    ? "board"
    : (WATCHLIST_TIER.get(job.company?.toLowerCase()) || "monitor");
  return {
    id: job.id,
    title: job.title,
    company: job.company,
    url: job.url,
    description: job.descriptionText || "",
    geoSignals: transformGeoSignals(job.geoSignals),
    cstCompatible: Boolean(job.flags?.centralTime),
    source: shortSource(job.source),
    postedAt: formatDate(job.postedAt),
    tier,
    salary: "",
    salaryMin: 0,
    isNew: job.isNew || false,
    status: job.status || "Not Applied",
  };
}

function makeWatchlistPlaceholder(w) {
  return {
    id: `watch-${w.name}`,
    title: "Check for open roles",
    company: w.name,
    url: w.url,
    geoSignals: { positive: ["confirmed global remote"], negative: [] },
    cstCompatible: false,
    source: "Watchlist",
    tier: w.tier,
    description: "",
    salaryMin: 0,
    isNew: false,
    status: "Not Applied",
  };
}

// ─── Design tokens ────────────────────────────────────────────────────────────

const GLASS = {
  background: "rgba(255,255,255,0.62)",
  backdropFilter: "blur(28px) saturate(1.8)",
  WebkitBackdropFilter: "blur(28px) saturate(1.8)",
  border: "0.5px solid rgba(255,255,255,0.75)",
};

const FONT = "-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif";

// ─── Components ──────────────────────────────────────────────────────────────

function CopyButton({ url }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button
      onClick={handleCopy}
      style={{
        padding: "3px 9px",
        borderRadius: "20px",
        border: "0.5px solid rgba(0,0,0,0.09)",
        background: copied ? "rgba(52,199,89,0.12)" : "rgba(0,0,0,0.04)",
        color: copied ? "#248A3D" : "#8E8E93",
        fontSize: "10px",
        cursor: "pointer",
        fontFamily: FONT,
        lineHeight: "17px",
        transition: "all 0.15s",
      }}
    >
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

function StatusBadge({ status, onChange }) {
  const [open, setOpen] = useState(false);
  const c = STATUS_COLORS[status] || STATUS_COLORS["Not Applied"];
  return (
    <div style={{ position: "relative", flexShrink: 0 }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "5px",
          padding: "3px 9px",
          borderRadius: "20px",
          border: "none",
          background: c.bg,
          color: c.text,
          fontSize: "10px",
          fontWeight: "600",
          cursor: "pointer",
          fontFamily: FONT,
          letterSpacing: "0.01em",
          lineHeight: "17px",
          whiteSpace: "nowrap",
        }}
      >
        <div style={{ width: "5px", height: "5px", borderRadius: "50%", background: c.dot, flexShrink: 0 }} />
        {status}
        <span style={{ fontSize: "8px", opacity: 0.4 }}>▼</span>
      </button>
      {open && (
        <div style={{
          position: "absolute",
          top: "calc(100% + 4px)",
          right: 0,
          ...GLASS,
          borderRadius: "12px",
          boxShadow: "0 8px 32px rgba(0,0,0,0.14)",
          zIndex: 200,
          overflow: "hidden",
          minWidth: "138px",
        }}>
          {STATUS_OPTIONS.map(s => {
            const sc = STATUS_COLORS[s];
            return (
              <button
                key={s}
                onClick={() => { onChange(s); setOpen(false); }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  width: "100%",
                  padding: "8px 12px",
                  border: "none",
                  background: s === status ? "rgba(0,0,0,0.04)" : "transparent",
                  color: sc.text,
                  fontSize: "11px",
                  fontWeight: "500",
                  cursor: "pointer",
                  textAlign: "left",
                  fontFamily: FONT,
                }}
              >
                <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: sc.dot, flexShrink: 0 }} />
                {s}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function GeoSignalTag({ signal, type }) {
  const pos = type === "positive";
  return (
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      gap: "3px",
      padding: "1px 6px",
      borderRadius: "20px",
      fontSize: "9px",
      fontWeight: "500",
      background: pos ? "rgba(52,199,89,0.1)" : "rgba(255,59,48,0.08)",
      color: pos ? "#248A3D" : "#C0392B",
      border: `0.5px solid ${pos ? "rgba(52,199,89,0.25)" : "rgba(255,59,48,0.2)"}`,
      whiteSpace: "nowrap",
    }}>
      {pos ? "✓" : "✗"} {signal}
    </span>
  );
}

function JobCard({ job, onStatusChange, onDismiss, dismissed }) {
  const [expanded, setExpanded] = useState(false);

  const actionBtn = {
    padding: "3px 9px",
    borderRadius: "20px",
    border: "0.5px solid rgba(0,0,0,0.09)",
    background: "rgba(0,0,0,0.04)",
    color: "#8E8E93",
    fontSize: "10px",
    cursor: "pointer",
    fontFamily: FONT,
    lineHeight: "17px",
    transition: "all 0.15s",
  };

  return (
    <div
      style={{
        ...GLASS,
        background: dismissed
          ? "rgba(255,255,255,0.38)"
          : "rgba(255,255,255,0.72)",
        borderRadius: "14px",
        overflow: "hidden",
        transition: "box-shadow 0.18s, transform 0.18s",
        boxShadow: "0 2px 12px rgba(31,38,135,0.06)",
        opacity: dismissed ? 0.55 : 1,
      }}
      onMouseEnter={e => {
        e.currentTarget.style.boxShadow = "0 6px 28px rgba(31,38,135,0.12)";
        e.currentTarget.style.transform = "translateY(-1px)";
      }}
      onMouseLeave={e => {
        e.currentTarget.style.boxShadow = "0 2px 12px rgba(31,38,135,0.06)";
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      <div style={{ padding: "10px 14px" }}>

        {/* Row 1: company + badges + status */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", marginBottom: "4px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "5px", minWidth: 0, overflow: "hidden" }}>
            <span style={{
              fontSize: "10px",
              fontWeight: "600",
              color: "#AEAEB2",
              textTransform: "uppercase",
              letterSpacing: "0.07em",
              whiteSpace: "nowrap",
            }}>
              {job.company}
            </span>
            {job.tier === "confirmed" && (
              <span style={{
                fontSize: "9px", fontWeight: "600",
                color: "#007AFF", background: "rgba(0,122,255,0.1)",
                padding: "1px 5px", borderRadius: "4px",
                letterSpacing: "0.02em", whiteSpace: "nowrap",
              }}>
                WATCHLIST
              </span>
            )}
            {job.cstCompatible && (
              <span style={{
                fontSize: "9px", fontWeight: "600",
                color: "#8B5CF6", background: "rgba(139,92,246,0.1)",
                padding: "1px 5px", borderRadius: "4px",
                letterSpacing: "0.02em", whiteSpace: "nowrap",
              }}>
                CST
              </span>
            )}
            {job.source && (
              <span style={{
                fontSize: "9px", fontWeight: "500",
                color: "#C7C7CC", background: "rgba(0,0,0,0.04)",
                padding: "1px 5px", borderRadius: "4px", whiteSpace: "nowrap",
              }}>
                {job.source}
              </span>
            )}
          </div>
          <StatusBadge status={job.status} onChange={(s) => onStatusChange(job.id, s)} />
        </div>

        {/* Row 2: title */}
        <p style={{
          margin: "0 0 7px",
          fontSize: "13px",
          fontWeight: "500",
          color: "#1C1C1E",
          lineHeight: "1.35",
          letterSpacing: "-0.01em",
        }}>
          {job.title}
        </p>

        {/* Row 3: geo pills + date + buttons */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "6px", flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: "4px", alignItems: "center", flexWrap: "wrap" }}>
            {job.geoSignals?.positive.slice(0, 2).map(s => <GeoSignalTag key={s} signal={s} type="positive" />)}
            {job.geoSignals?.negative.slice(0, 1).map(s => <GeoSignalTag key={s} signal={s} type="negative" />)}
          </div>
          <div style={{ display: "flex", gap: "5px", alignItems: "center", flexShrink: 0 }}>
            {job.salary && (
              <span style={{ fontSize: "10px", color: "#3C3C43", fontWeight: "500", marginRight: "2px" }}>{job.salary}</span>
            )}
            {job.postedAt && (
              <span style={{ fontSize: "10px", color: "#C7C7CC", marginRight: "2px" }}>{job.postedAt}</span>
            )}
            <button
              onClick={() => onDismiss(job.id)}
              style={{
                ...actionBtn,
                background: dismissed ? "rgba(255,149,0,0.1)" : "rgba(0,0,0,0.04)",
                color: dismissed ? "#C07800" : "#C7C7CC",
                borderColor: dismissed ? "rgba(255,149,0,0.2)" : "rgba(0,0,0,0.09)",
              }}
            >
              {dismissed ? "Restore" : "✕"}
            </button>
            <CopyButton url={job.url} />
            <button onClick={() => setExpanded(!expanded)} style={actionBtn}>
              {expanded ? "Less" : "More"}
            </button>
            <a
              href={job.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                padding: "3px 12px",
                borderRadius: "20px",
                border: "none",
                background: "rgba(0,122,255,0.9)",
                color: "#FFF",
                fontSize: "10px",
                fontWeight: "600",
                cursor: "pointer",
                textDecoration: "none",
                fontFamily: FONT,
                lineHeight: "17px",
                display: "inline-block",
              }}
            >
              Apply →
            </a>
          </div>
        </div>

        {expanded && job.description && (
          <div style={{
            marginTop: "10px",
            paddingTop: "10px",
            borderTop: "0.5px solid rgba(0,0,0,0.06)",
            fontSize: "11px",
            color: "#636366",
            lineHeight: "1.6",
          }}>
            {job.description.slice(0, 400)}{job.description.length > 400 ? "…" : ""}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── App ─────────────────────────────────────────────────────────────────────

export default function App() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [activeFilter, setActiveFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [minSalary, setMinSalary] = useState(0);
  const [cstOnly, setCstOnly] = useState(false);
  const [showDismissed, setShowDismissed] = useState(false);
  const [jobStatuses, setJobStatuses] = useState(() => {
    try { return JSON.parse(localStorage.getItem("jobStatuses") || "{}"); } catch { return {}; }
  });
  const [dismissedJobs, setDismissedJobs] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem("dismissedJobs") || "[]")); } catch { return new Set(); }
  });

  // ── Data loading (unchanged) ───────────────────────────────────────────────

  const loadJobs = async () => {
    setLoading(true);
    try {
      const res = await fetch("/data/jobs.json");
      if (!res.ok) throw new Error("not found");
      const data = await res.json();
      const agentJobs = (data.jobs || []).map(normalizeJob);
      const agentCompanies = new Set(agentJobs.map((j) => j.company.toLowerCase()));
      const placeholders = WATCHLIST
        .filter((w) => !agentCompanies.has(w.name.toLowerCase()))
        .map(makeWatchlistPlaceholder);
      setJobs([...agentJobs, ...placeholders]);
      if (data.lastChecked) setLastUpdated(new Date(data.lastChecked));
    } catch {
      setJobs(WATCHLIST.map(makeWatchlistPlaceholder));
    }
    setLoading(false);
  };

  useEffect(() => { loadJobs(); }, []);

  useEffect(() => {
    try { localStorage.setItem("jobStatuses", JSON.stringify(jobStatuses)); } catch {}
  }, [jobStatuses]);

  useEffect(() => {
    try { localStorage.setItem("dismissedJobs", JSON.stringify([...dismissedJobs])); } catch {}
  }, [dismissedJobs]);

  // ── Handlers (unchanged) ──────────────────────────────────────────────────

  const handleStatusChange = (id, status) => {
    setJobStatuses((prev) => ({ ...prev, [id]: status }));
  };

  const handleDismiss = (id) => {
    setDismissedJobs((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  };

  const getJobWithStatus = (job) => ({
    ...job,
    status: jobStatuses[job.id] || job.status || "Not Applied",
    dismissed: dismissedJobs.has(job.id),
  });

  // ── Filtering (unchanged) ─────────────────────────────────────────────────

  const filtered = jobs
    .map(getJobWithStatus)
    .filter((j) => {
      if (showDismissed) return j.dismissed;
      if (j.dismissed) return false;
      if (activeFilter === "Watchlist" && j.tier === "board") return false;
      if (activeFilter === "Boards" && j.tier !== "board") return false;
      if (activeFilter === "Confirmed" && j.tier !== "confirmed") return false;
      if (statusFilter !== "All" && j.status !== statusFilter) return false;
      if (searchTerm && !j.title.toLowerCase().includes(searchTerm.toLowerCase()) && !j.company.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      if (minSalary > 0 && j.salaryMin > 0 && j.salaryMin < minSalary * 1000) return false;
      if (cstOnly && !j.cstCompatible) return false;
      return true;
    });

  const appliedCount = Object.values(jobStatuses).filter((s) => s === "Applied").length;
  const interviewingCount = Object.values(jobStatuses).filter((s) => s === "Interviewing").length;
  const boardJobs = jobs.filter((j) => j.tier === "board");

  // ── Style helpers ─────────────────────────────────────────────────────────

  const pillBtn = (active, activeColor = "#007AFF") => ({
    padding: "5px 13px",
    borderRadius: "20px",
    border: active ? "none" : "0.5px solid rgba(0,0,0,0.1)",
    background: active ? activeColor : "rgba(255,255,255,0.55)",
    color: active ? "#FFF" : "#6C6C70",
    fontSize: "11px",
    fontWeight: active ? "600" : "400",
    cursor: "pointer",
    fontFamily: FONT,
    lineHeight: "17px",
    transition: "all 0.15s",
  });

  const statusPillBtn = (active) => ({
    padding: "4px 10px",
    borderRadius: "20px",
    border: "none",
    background: active ? "rgba(0,122,255,0.1)" : "transparent",
    color: active ? "#007AFF" : "#AEAEB2",
    fontSize: "10px",
    fontWeight: active ? "600" : "400",
    cursor: "pointer",
    fontFamily: FONT,
    lineHeight: "17px",
  });

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(160deg, #C2DCFB 0%, #D8EBFF 28%, #EBF3FF 60%, #F5F9FF 100%)",
      fontFamily: FONT,
    }}>

      {/* ── Sticky menu bar ── */}
      <div style={{
        ...GLASS,
        background: "rgba(242,246,255,0.82)",
        borderBottom: "0.5px solid rgba(255,255,255,0.7)",
        borderRadius: 0,
        padding: "0 22px",
        height: "28px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        position: "sticky",
        top: 0,
        zIndex: 50,
        boxShadow: "0 1px 12px rgba(31,38,135,0.06)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <span style={{ fontSize: "12px", fontWeight: "700", color: "#1C1C1E", letterSpacing: "-0.01em" }}>JobRadar</span>
          {["File", "View", "Filter"].map(label => (
            <span key={label} style={{ fontSize: "11px", color: "#8E8E93" }}>{label}</span>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          {lastUpdated && (
            <span style={{ fontSize: "10px", color: "#AEAEB2" }}>
              Updated {lastUpdated.toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
          <button
            onClick={loadJobs}
            style={{
              padding: "2px 11px",
              borderRadius: "20px",
              border: "0.5px solid rgba(0,122,255,0.25)",
              background: "rgba(0,122,255,0.07)",
              color: "#007AFF",
              fontSize: "10px",
              fontWeight: "500",
              cursor: "pointer",
              fontFamily: FONT,
              lineHeight: "18px",
            }}
          >
            Refresh
          </button>
        </div>
      </div>

      {/* ── Page content ── */}
      <div style={{ maxWidth: "960px", margin: "0 auto", padding: "22px 24px 44px" }}>

        {/* ── Stats tiles ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", marginBottom: "16px" }}>
          {[
            { label: "Live Roles",   value: boardJobs.length,    color: "#007AFF", glow: "rgba(0,122,255,0.15)" },
            { label: "Watchlist",    value: WATCHLIST.length,    color: "#8B5CF6", glow: "rgba(139,92,246,0.15)" },
            { label: "Applied",      value: appliedCount,        color: "#34C759", glow: "rgba(52,199,89,0.15)"  },
            { label: "Interviewing", value: interviewingCount,   color: "#FF9500", glow: "rgba(255,149,0,0.15)"  },
          ].map((stat, i) => (
            <div key={i} style={{
              ...GLASS,
              borderRadius: "18px",
              padding: "16px 20px",
              boxShadow: "0 4px 24px rgba(31,38,135,0.07), 0 1px 0 rgba(255,255,255,0.8) inset",
              position: "relative",
              overflow: "hidden",
            }}>
              {/* coloured glow blob */}
              <div style={{
                position: "absolute",
                top: "-18px",
                right: "-18px",
                width: "72px",
                height: "72px",
                borderRadius: "50%",
                background: `radial-gradient(circle, ${stat.glow} 0%, transparent 70%)`,
                pointerEvents: "none",
              }} />
              <div style={{
                fontSize: "30px",
                fontWeight: "700",
                color: stat.color,
                lineHeight: 1,
                letterSpacing: "-0.03em",
              }}>
                {loading ? "—" : stat.value}
              </div>
              <div style={{
                fontSize: "11px",
                color: "#AEAEB2",
                marginTop: "5px",
                fontWeight: "400",
                letterSpacing: "0.02em",
              }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        {/* ── Main glass panel ── */}
        <div style={{
          ...GLASS,
          borderRadius: "20px",
          boxShadow: "0 8px 40px rgba(31,38,135,0.1), 0 1px 0 rgba(255,255,255,0.8) inset",
          overflow: "hidden",
        }}>

          {/* Window chrome */}
          <div style={{
            background: "rgba(240,245,255,0.9)",
            borderBottom: "0.5px solid rgba(255,255,255,0.6)",
            padding: "10px 16px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}>
            <div style={{ display: "flex", gap: "6px" }}>
              <div style={{ width: "11px", height: "11px", borderRadius: "50%", background: "#FF5F57" }} />
              <div style={{ width: "11px", height: "11px", borderRadius: "50%", background: "#FEBC2E" }} />
              <div style={{ width: "11px", height: "11px", borderRadius: "50%", background: "#28C840" }} />
            </div>
            <span style={{ fontSize: "12px", fontWeight: "500", color: "#636366", flex: 1, textAlign: "center", letterSpacing: "-0.01em" }}>
              Global Remote CSM — Job Radar
            </span>
          </div>

          {/* Filter bar */}
          <div style={{
            padding: "10px 16px",
            borderBottom: "0.5px solid rgba(0,0,0,0.05)",
            display: "flex",
            gap: "7px",
            alignItems: "center",
            flexWrap: "wrap",
            background: "rgba(248,250,255,0.6)",
          }}>

            {/* Search */}
            <div style={{ position: "relative", flex: "0 0 162px" }}>
              <span style={{
                position: "absolute", left: "10px", top: "50%",
                transform: "translateY(-50%)", fontSize: "12px",
                color: "#C7C7CC", pointerEvents: "none",
              }}>⌕</span>
              <input
                type="text"
                placeholder="Search roles or companies…"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={{
                  width: "100%",
                  padding: "5px 10px 5px 26px",
                  borderRadius: "20px",
                  border: "0.5px solid rgba(0,0,0,0.08)",
                  background: "rgba(255,255,255,0.7)",
                  fontSize: "11px",
                  color: "#1C1C1E",
                  outline: "none",
                  fontFamily: FONT,
                  boxSizing: "border-box",
                  lineHeight: "17px",
                }}
              />
            </div>

            {/* Source filter pills */}
            <div style={{ display: "flex", gap: "4px" }}>
              {["All", "Boards", "Watchlist", "Confirmed"].map(f => (
                <button key={f} onClick={() => setActiveFilter(f)} style={pillBtn(activeFilter === f)}>
                  {f}
                </button>
              ))}
            </div>

            {/* CST toggle */}
            <label style={{
              display: "flex", alignItems: "center", gap: "5px",
              cursor: "pointer", fontSize: "11px",
              color: cstOnly ? "#8B5CF6" : "#AEAEB2",
              fontWeight: cstOnly ? "600" : "400",
              userSelect: "none",
            }}>
              <input
                type="checkbox" checked={cstOnly}
                onChange={e => setCstOnly(e.target.checked)}
                style={{ cursor: "pointer", accentColor: "#8B5CF6", width: "11px", height: "11px" }}
              />
              CST only
            </label>

            {/* Show dismissed toggle */}
            <label style={{
              display: "flex", alignItems: "center", gap: "5px",
              cursor: "pointer", fontSize: "11px",
              color: showDismissed ? "#FF9500" : "#AEAEB2",
              fontWeight: showDismissed ? "600" : "400",
              userSelect: "none",
            }}>
              <input
                type="checkbox" checked={showDismissed}
                onChange={e => setShowDismissed(e.target.checked)}
                style={{ cursor: "pointer", accentColor: "#FF9500", width: "11px", height: "11px" }}
              />
              Show dismissed
            </label>

            {/* Min salary */}
            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <span style={{ fontSize: "10px", color: "#C7C7CC" }}>Min $</span>
              <input
                type="number"
                placeholder="0"
                value={minSalary || ""}
                onChange={e => setMinSalary(Number(e.target.value))}
                style={{
                  width: "52px",
                  padding: "4px 8px",
                  borderRadius: "20px",
                  border: "0.5px solid rgba(0,0,0,0.08)",
                  background: "rgba(255,255,255,0.7)",
                  fontSize: "10px",
                  color: "#1C1C1E",
                  outline: "none",
                  fontFamily: FONT,
                  lineHeight: "17px",
                }}
              />
              <span style={{ fontSize: "10px", color: "#C7C7CC" }}>k</span>
            </div>

            {/* Status filter pills */}
            <div style={{ display: "flex", gap: "2px", marginLeft: "auto", flexWrap: "wrap" }}>
              {["All", ...STATUS_OPTIONS].map(f => (
                <button key={f} onClick={() => setStatusFilter(f)} style={statusPillBtn(statusFilter === f)}>
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* Job list */}
          <div style={{ padding: "14px 16px", maxHeight: "600px", overflowY: "auto" }}>
            {loading ? (
              <div style={{ padding: "56px 0", textAlign: "center" }}>
                <span style={{ fontSize: "12px", color: "#C7C7CC", letterSpacing: "0.02em" }}>Loading jobs…</span>
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: "56px 0", textAlign: "center" }}>
                <span style={{ fontSize: "12px", color: "#C7C7CC" }}>
                  {showDismissed ? "No dismissed roles." : "No roles match your filters."}
                </span>
              </div>
            ) : (
              <div style={{ maxWidth: "700px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "7px" }}>
                {filtered.map(job => (
                  <JobCard
                    key={job.id}
                    job={job}
                    onStatusChange={handleStatusChange}
                    onDismiss={handleDismiss}
                    dismissed={job.dismissed}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div style={{
            padding: "9px 16px",
            borderTop: "0.5px solid rgba(0,0,0,0.05)",
            background: "rgba(240,245,255,0.6)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}>
            <span style={{ fontSize: "10px", color: "#AEAEB2" }}>
              {filtered.length} role{filtered.length !== 1 ? "s" : ""} shown
              {dismissedJobs.size > 0 && !showDismissed && (
                <span style={{ color: "#C7C7CC" }}> · {dismissedJobs.size} dismissed</span>
              )}
            </span>
            <span style={{ fontSize: "10px", color: "#C7C7CC" }}>
              We Work Remotely · Remote OK · Watchlist
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
