"use client";

// Last-resort screen for a failure in the root layout itself. Uses plain inline
// styles because the app's stylesheet may not have loaded.
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#f4f6fa", color: "#14181f" }}>
        <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, textAlign: "center" }}>
          <div style={{ maxWidth: 360 }}>
            <h1 style={{ fontSize: 20, margin: "0 0 8px" }}>Something went wrong</h1>
            <p style={{ fontSize: 14, color: "#5b6472", margin: "0 0 20px" }}>The app couldn&apos;t start. Check your connection and try again.</p>
            <button
              type="button"
              onClick={reset}
              style={{ minHeight: 44, padding: "0 24px", border: 0, borderRadius: 8, background: "#1d4ed8", color: "#fff", fontSize: 14, fontWeight: 600 }}
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
