import { ImageResponse } from "next/og";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#f7d34a", color: "#171717", fontSize: 42, fontWeight: 900, border: "5px solid #171717" }}>△</div>,
    size,
  );
}

