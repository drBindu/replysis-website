"use client";

/**
 * Interview avatar.
 *
 * This is a decoration, so it is built from plain CSS and has no dependency
 * that can fail at runtime. It renders identically on the server and the
 * client, so it cannot cause a hydration mismatch.
 *
 * The WebGL version lives in AiRobot3D.tsx and is deliberately NOT imported
 * here. @react-three/fiber v8 requires React 18 (peer "react >=18 <19") while
 * Next bundles React 19, whose internals no longer expose ReactCurrentOwner.
 * Loading that module would throw. It is kept on disk untouched so the
 * dependency migration can be done on its own branch; until then nothing in
 * the normal path references it, and no Three.js code reaches the bundle.
 */

const ACCENT = "#1C7A3E";

export default function AiRobot3DSafe({ isSpeaking }: { isSpeaking: boolean }) {
  return (
    <div
      aria-hidden="true"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        height: "100%",
      }}
    >
      <div
        style={{
          position: "relative",
          width: 132,
          height: 132,
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(145deg, #ffffff 0%, #eef1f6 100%)",
          border: "1px solid rgba(28,122,62,0.16)",
          boxShadow: isSpeaking
            ? "0 0 0 6px rgba(28,122,62,0.10), 0 10px 30px rgba(15,23,42,0.10)"
            : "0 10px 30px rgba(15,23,42,0.08)",
          transition: "box-shadow 240ms ease",
        }}
      >
        {/* Head */}
        <div
          style={{
            width: 74,
            height: 62,
            borderRadius: 18,
            background: "linear-gradient(160deg, #16213a 0%, #0b1220 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.10)",
          }}
        >
          <Eye active={isSpeaking} />
          <Eye active={isSpeaking} />
        </div>

        {/* Mouth bar, widens while speaking */}
        <div
          style={{
            position: "absolute",
            bottom: 34,
            width: isSpeaking ? 30 : 20,
            height: 4,
            borderRadius: 2,
            background: ACCENT,
            opacity: isSpeaking ? 1 : 0.55,
            transition: "width 200ms ease, opacity 200ms ease",
          }}
        />
      </div>
    </div>
  );
}

function Eye({ active }: { active: boolean }) {
  return (
    <span
      style={{
        width: 11,
        height: 11,
        borderRadius: "50%",
        background: active ? ACCENT : "#8fa3b8",
        boxShadow: active ? `0 0 10px ${ACCENT}` : "none",
        transition: "background 200ms ease, box-shadow 200ms ease",
      }}
    />
  );
}
