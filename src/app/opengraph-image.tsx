import { ImageResponse } from "next/og";

export const alt =
  "ProcureTrack — Procurement and Execution Tracking Dashboard";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "flex-start",
          background: "linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)",
          padding: "80px",
          fontFamily: "system-ui, sans-serif",
          position: "relative",
        }}
      >
        {/* Accent bar */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "8px",
            height: "100%",
            background: "linear-gradient(180deg, #2563eb, #38bdf8)",
          }}
        />

        {/* Badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            background: "rgba(37,99,235,0.25)",
            border: "1px solid rgba(37,99,235,0.5)",
            borderRadius: "24px",
            padding: "8px 20px",
            marginBottom: "40px",
          }}
        >
          <span
            style={{ fontSize: "18px", color: "#93c5fd", fontWeight: 600 }}
          >
            Procurement · Execution · Milestones
          </span>
        </div>

        {/* Wordmark */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            marginBottom: "24px",
          }}
        >
          <div
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "14px",
              background: "linear-gradient(135deg, #2563eb, #38bdf8)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "28px",
              fontWeight: 800,
              color: "#fff",
            }}
          >
            P
          </div>
          <span
            style={{ fontSize: "48px", fontWeight: 800, color: "#ffffff" }}
          >
            ProcureTrack
          </span>
        </div>

        {/* Headline */}
        <div
          style={{
            fontSize: "52px",
            fontWeight: 800,
            color: "#f1f5f9",
            lineHeight: 1.15,
            marginBottom: "28px",
            maxWidth: "900px",
          }}
        >
          The project lifecycle,{" "}
          <span style={{ color: "#38bdf8" }}>on one dashboard</span>
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: "26px",
            color: "#94a3b8",
            fontWeight: 400,
            maxWidth: "800px",
          }}
        >
          From RFQ to handover — every package, every rupee, live.
        </div>

        {/* Bottom chips */}
        <div
          style={{
            position: "absolute",
            bottom: "60px",
            left: "88px",
            display: "flex",
            gap: "16px",
          }}
        >
          {[
            "RFQ to Award",
            "Milestone Tracking",
            "Budget Analytics",
            "14-day Free Trial",
          ].map((label) => (
            <div
              key={label}
              style={{
                background: "rgba(255,255,255,0.07)",
                border: "1px solid rgba(255,255,255,0.15)",
                borderRadius: "8px",
                padding: "8px 16px",
                fontSize: "16px",
                color: "#cbd5e1",
                fontWeight: 500,
              }}
            >
              {label}
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size }
  );
}
