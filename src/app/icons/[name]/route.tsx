import { ImageResponse } from "next/og";

/**
 * App icons for the installable admin (home-screen icon, Android splash, notification badge).
 * /icons/192, /icons/512, /icons/180 (Apple), /icons/maskable-512, /icons/badge (monochrome).
 */
const SIZES: Record<string, { size: number; maskable?: boolean; badge?: boolean }> = {
  "180": { size: 180 },
  "192": { size: 192 },
  "512": { size: 512 },
  "maskable-512": { size: 512, maskable: true },
  badge: { size: 96, badge: true },
};

export function generateStaticParams() {
  return Object.keys(SIZES).map((name) => ({ name }));
}

export async function GET(_req: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const spec = SIZES[name];
  if (!spec) return new Response("Not found", { status: 404 });
  const { size } = spec;

  if (spec.badge) {
    // Android shows the badge as a white silhouette in the status bar.
    return new ImageResponse(
      (
        <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 72, fontWeight: 900 }}>
          S
        </div>
      ),
      { width: size, height: size },
    );
  }

  // Maskable icons need the artwork inside the central 80% "safe zone".
  const pad = spec.maskable ? size * 0.2 : size * 0.1;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#0b4f7c" }}>
        <div
          style={{
            width: size - pad * 2,
            height: size - pad * 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#facc15",
            border: `${Math.round(size * 0.035)}px solid #0f2a43`,
            borderRadius: size * 0.14,
            color: "#0f2a43",
            fontSize: (size - pad * 2) * 0.62,
            fontWeight: 900,
          }}
        >
          S
        </div>
      </div>
    ),
    { width: size, height: size, headers: { "Cache-Control": "public, max-age=604800, immutable" } },
  );
}
