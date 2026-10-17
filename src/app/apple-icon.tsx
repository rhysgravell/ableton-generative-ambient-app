import { ImageResponse } from "next/og";

// Home-screen icon: the rail's three-bar wordmark on the dark ground. iOS rounds the corners itself.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

const bars = [
  { width: 112, opacity: 1 },
  { width: 79, opacity: 0.55 },
  { width: 45, opacity: 0.25 },
];

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: 17,
          paddingLeft: 34,
          background: "#0b1015",
        }}
      >
        {bars.map((b) => (
          <div key={b.width} style={{ width: b.width, height: 17, borderRadius: 9, background: "#96d4b8", opacity: b.opacity }} />
        ))}
      </div>
    ),
    size,
  );
}
