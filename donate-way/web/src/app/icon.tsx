import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#0d1b1e", borderRadius: 112 }}>
        <svg width="400" height="400" viewBox="0 0 512 512">
          <path d="M256 418C120 326 92 232 146 178c44-44 100-28 110 14 10-42 66-58 110-14 54 54 26 148-110 240z" fill="#c6f432" />
          <path d="M196 262l44 44 84-92" fill="none" stroke="#0d1b1e" strokeWidth="34" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    ),
    size
  );
}
