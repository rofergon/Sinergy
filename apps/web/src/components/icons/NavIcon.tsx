const paths: Record<string, string[]> = {
  compass: [
    "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z",
    "m15.2 8.8-2 5.2-5.4 2 2-5.4 5.4-1.8Z",
  ],
  building: [
    "M4 21V5a2 2 0 0 1 2-2h8v18",
    "M14 8h4a2 2 0 0 1 2 2v11",
    "M8 7h2M8 11h2M8 15h2M18 14h-2M18 18h-2",
  ],
  users: [
    "M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2",
    "M9.5 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z",
    "M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8",
  ],
  layers: ["m12 3 9 5-9 5-9-5 9-5Z", "m3 12 9 5 9-5", "m3 17 9 5 9-5"],
  warning: [
    "M10.3 4.2 2.8 17a2 2 0 0 0 1.7 3h15a2 2 0 0 0 1.7-3L13.7 4.2a2 2 0 0 0-3.4 0Z",
    "M12 9v4M12 17h.01",
  ],
  chart: ["M4 19V5", "M8 17V9", "M12 17V7", "M16 17v-5", "M20 19H3"],
};

export function NavIcon({ name }: { name: string }) {
  return (
    <svg className="nav-icon" viewBox="0 0 24 24" aria-hidden="true">
      {paths[name].map((path) => (
        <path key={path} d={path} />
      ))}
    </svg>
  );
}
