import type { SVGProps } from "react";

const base = { width: 19, height: 19, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

export function HomeIcon(props: SVGProps<SVGSVGElement>) { return <svg {...base} {...props}><path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10"/><path d="M9 20v-6h6v6"/></svg>; }
export function CalendarIcon(props: SVGProps<SVGSVGElement>) { return <svg {...base} {...props}><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></svg>; }
export function CheckIcon(props: SVGProps<SVGSVGElement>) { return <svg {...base} {...props}><path d="m5 12 4 4L19 6"/></svg>; }
export function BookIcon(props: SVGProps<SVGSVGElement>) { return <svg {...base} {...props}><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z"/></svg>; }
export function RefreshIcon(props: SVGProps<SVGSVGElement>) { return <svg {...base} {...props}><path d="M20 6v6h-6"/><path d="M4 18v-6h6"/><path d="M18.5 9a7 7 0 0 0-12-2L4 9M5.5 15a7 7 0 0 0 12 2L20 15"/></svg>; }
export function PlusIcon(props: SVGProps<SVGSVGElement>) { return <svg {...base} {...props}><path d="M12 5v14M5 12h14"/></svg>; }
export function SearchIcon(props: SVGProps<SVGSVGElement>) { return <svg {...base} {...props}><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>; }
export function MoonIcon(props: SVGProps<SVGSVGElement>) { return <svg {...base} {...props}><path d="M21 12.8A8.5 8.5 0 1 1 11.2 3 6.5 6.5 0 0 0 21 12.8Z"/></svg>; }
export function SunIcon(props: SVGProps<SVGSVGElement>) { return <svg {...base} {...props}><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.66 6.34l1.41-1.41"/></svg>; }
export function AlertIcon(props: SVGProps<SVGSVGElement>) { return <svg {...base} {...props}><path d="M10.3 2.8 1.8 17.5A2 2 0 0 0 3.5 20h17a2 2 0 0 0 1.7-2.5L13.7 2.8a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4M12 17h.01"/></svg>; }
export function ArrowIcon(props: SVGProps<SVGSVGElement>) { return <svg {...base} {...props}><path d="M5 12h14M13 6l6 6-6 6"/></svg>; }
export function XIcon(props: SVGProps<SVGSVGElement>) { return <svg {...base} {...props}><path d="m6 6 12 12M18 6 6 18"/></svg>; }
