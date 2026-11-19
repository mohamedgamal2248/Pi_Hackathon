import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#0d1b1e", borderRadius: 112 }}>
        <div style={{ display: "flex", width: 300, height: 300, borderRadius: 150, background: "#c6f432", alignItems: "center", justifyContent: "center", color: "#0d1b1e", fontSize: 220, fontWeight: 800 }}>S</div>
      </div>
    ),
    size
  );
}
