import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "SafeState — recalls, made executable";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: 80,
          background: "#0a0e17",
          color: "#e8eef7",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: "linear-gradient(135deg,#10b981,#047857)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontSize: 34,
              fontWeight: 700,
            }}
          >
            S
          </div>
          <div style={{ fontSize: 30, color: "#34d399", fontWeight: 600 }}>SafeState</div>
        </div>
        <div style={{ fontSize: 74, fontWeight: 700, marginTop: 34, lineHeight: 1.05 }}>
          Recalls, made executable.
        </div>
        <div style={{ fontSize: 30, color: "#8a97ad", marginTop: 26, maxWidth: 920 }}>
          Transaction-time safety authorization for secondhand products — on Amazon Aurora DSQL +
          Vercel.
        </div>
      </div>
    ),
    { ...size },
  );
}
