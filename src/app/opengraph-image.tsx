import { ImageResponse } from "next/og";

export const alt = "Sagoon Driving School — calm, patient automatic driving lessons in Rockdale, Sydney";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 72, background: "linear-gradient(135deg, #0a3f63 0%, #0b4f7c 55%, #1677b8 100%)", color: "white", fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <div style={{ width: 96, height: 96, borderRadius: 16, border: "6px solid #0f2a43", background: "#facc15", color: "#0f2a43", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 64, fontWeight: 900 }}>S</div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 48, fontWeight: 800 }}>Sagoon Driving School</div>
            <div style={{ fontSize: 28, color: "#a9d2f0" }}>Rockdale & St George · Sydney NSW</div>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 72, fontWeight: 800, lineHeight: 1.1 }}>Calm, patient automatic</div>
          <div style={{ fontSize: 72, fontWeight: 800, lineHeight: 1.1, color: "#facc15" }}>driving lessons</div>
        </div>
        <div style={{ display: "flex", gap: 24, fontSize: 30 }}>
          <div style={{ display: "flex", background: "rgba(255,255,255,0.12)", padding: "12px 24px", borderRadius: 999 }}>Free pickup</div>
          <div style={{ display: "flex", background: "rgba(255,255,255,0.12)", padding: "12px 24px", borderRadius: 999 }}>Book online</div>
          <div style={{ display: "flex", background: "#facc15", color: "#0f2a43", padding: "12px 24px", borderRadius: 999, fontWeight: 800 }}>0451 634 722</div>
        </div>
      </div>
    ),
    size,
  );
}
