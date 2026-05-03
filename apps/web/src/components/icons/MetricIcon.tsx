const paths: Record<string, string[]> = {
  document: ["M7 3h7l4 4v14H7V3Z", "M14 3v5h4", "M10 12h5M10 16h5"],
  wallet: ["M4 7h15a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4V7Z", "M4 7V5a2 2 0 0 1 2-2h10", "M17 13h.01"],
  alert: [
    "M10.3 4.2 2.8 17a2 2 0 0 0 1.7 3h15a2 2 0 0 0 1.7-3L13.7 4.2a2 2 0 0 0-3.4 0Z",
    "M12 9v4M12 17h.01",
  ],
  shield: ["M12 3 19 6v5c0 5-3.2 8-7 10-3.8-2-7-5-7-10V6l7-3Z", "M12 8v7"],
  volume: ["M7 19V9", "M12 19V5", "M17 19v-7", "M4 19h16"],
  clock: ["M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z", "M12 7v5l3 2"],
  card: ["M4 7h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2Z", "M2 11h20", "M6 16h4"],
  check: ["M20 6 9 17l-5-5"],
  search: ["M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z", "m21 21-4.3-4.3"],
  filter: ["M4 6h16", "M7 12h10", "M10 18h4"],
  download: ["M12 3v12", "m7 10 5 5 5-5", "M5 21h14"],
  info: ["M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z", "M12 11v5", "M12 8h.01"],
  kebab: ["M12 5h.01", "M12 12h.01", "M12 19h.01"],
  chevronLeft: ["m15 18-6-6 6-6"],
  chevronRight: ["m9 18 6-6-6-6"],
  bell: ["M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9", "M13.7 21a2 2 0 0 1-3.4 0"],
};

export function MetricIcon({ name, className = "metric-svg" }: { name: string; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      {paths[name].map((path) => (
        <path key={path} d={path} />
      ))}
    </svg>
  );
}
