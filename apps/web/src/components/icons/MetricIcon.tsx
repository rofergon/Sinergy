const paths: Record<string, string[]> = {
  document: ["M7 3h7l4 4v14H7V3Z", "M14 3v5h4", "M10 12h5M10 16h5"],
  wallet: ["M4 7h15a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4V7Z", "M4 7V5a2 2 0 0 1 2-2h10", "M17 13h.01"],
  alert: [
    "M10.3 4.2 2.8 17a2 2 0 0 0 1.7 3h15a2 2 0 0 0 1.7-3L13.7 4.2a2 2 0 0 0-3.4 0Z",
    "M12 9v4M12 17h.01",
  ],
  shield: ["M12 3 19 6v5c0 5-3.2 8-7 10-3.8-2-7-5-7-10V6l7-3Z", "M12 8v7"],
  volume: ["M7 19V9", "M12 19V5", "M17 19v-7", "M4 19h16"],
};

export function MetricIcon({ name }: { name: string }) {
  return (
    <svg className="metric-svg" viewBox="0 0 24 24" aria-hidden="true">
      {paths[name].map((path) => (
        <path key={path} d={path} />
      ))}
    </svg>
  );
}
