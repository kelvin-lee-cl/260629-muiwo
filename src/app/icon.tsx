import { ImageResponse } from "next/og";

export const size = {
  width: 32,
  height: 32,
};

export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#ecfdf5",
        }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 32 32"
          width="24"
          height="24"
        >
          <path
            fill="#16a34a"
            d="M16 27.5c-.3 0-.6-.1-.8-.3C14.5 26.5 3 17.5 3 10.5 3 6.9 5.9 4 9.5 4c2.3 0 4.4 1.1 5.5 2.8C16.1 5.1 18.2 4 20.5 4 24.1 4 27 6.9 27 10.5c0 7-11.5 16-12.2 16.7-.2.2-.5.3-.8.3z"
          />
        </svg>
      </div>
    ),
    {
      ...size,
    },
  );
}
