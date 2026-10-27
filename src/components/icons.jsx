// Ícones em SVG (traço no estilo Lucide, licença ISC) — sem dependência externa
const make = (name, children) => {
  const Icon = ({ size = 20, strokeWidth = 2, ...rest }) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  )
  Icon.displayName = name
  return Icon
}

const circle = <circle cx="12" cy="12" r="10" />

export const ArrowLeft = make('ArrowLeft', <><path d="m12 19-7-7 7-7" /><path d="M19 12H5" /></>)
export const ArrowUp = make('ArrowUp', <><path d="m5 12 7-7 7 7" /><path d="M12 19V5" /></>)
export const ArrowDown = make('ArrowDown', <><path d="M12 5v14" /><path d="m19 12-7 7-7-7" /></>)
export const X = make('X', <><path d="M18 6 6 18" /><path d="m6 6 12 12" /></>)
export const Plus = make('Plus', <><path d="M5 12h14" /><path d="M12 5v14" /></>)
export const Check = make('Check', <path d="M20 6 9 17l-5-5" />)
export const Search = make('Search', <><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></>)
export const Trash2 = make('Trash2', <><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /><path d="M10 11v6" /><path d="M14 11v6" /></>)
export const Download = make('Download', <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="m7 10 5 5 5-5" /><path d="M12 15V3" /></>)
export const Upload = make('Upload', <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="m17 8-5-5-5 5" /><path d="M12 3v12" /></>)
export const Copy = make('Copy', <><rect x="8" y="8" width="14" height="14" rx="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" /></>)
export const CircleCheck = make('CircleCheck', <>{circle}<path d="m9 12 2 2 4-4" /></>)
export const CircleAlert = make('CircleAlert', <>{circle}<path d="M12 8v4" /><path d="M12 16h.01" /></>)
export const CircleX = make('CircleX', <>{circle}<path d="m15 9-6 6" /><path d="m9 9 6 6" /></>)
export const Clock3 = make('Clock3', <>{circle}<path d="M12 6v6h4.5" /></>)
export const Ellipsis = make('Ellipsis', <><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /><circle cx="5" cy="12" r="1" /></>)
export const LayoutDashboard = make('LayoutDashboard', <><rect x="3" y="3" width="7" height="9" rx="1" /><rect x="14" y="3" width="7" height="5" rx="1" /><rect x="14" y="12" width="7" height="9" rx="1" /><rect x="3" y="16" width="7" height="5" rx="1" /></>)
export const FileText = make('FileText', <><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" /><path d="M14 2v4a2 2 0 0 0 2 2h4" /><path d="M10 9H8" /><path d="M16 13H8" /><path d="M16 17H8" /></>)
export const ClipboardList = make('ClipboardList', <><rect x="8" y="2" width="8" height="4" rx="1" /><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><path d="M12 11h4" /><path d="M12 16h4" /><path d="M8 11h.01" /><path d="M8 16h.01" /></>)
export const Calculator = make('Calculator', <><rect x="4" y="2" width="16" height="20" rx="2" /><path d="M8 6h8" /><path d="M16 14v4" /><path d="M16 10h.01" /><path d="M12 10h.01" /><path d="M8 10h.01" /><path d="M12 14h.01" /><path d="M8 14h.01" /><path d="M12 18h.01" /><path d="M8 18h.01" /></>)
export const Gavel = make('Gavel', <><path d="m14 13-7.5 7.5a2.12 2.12 0 0 1-3-3L11 10" /><path d="m16 16 6-6" /><path d="m8 8 6-6" /><path d="m9 7 8 8" /><path d="m21 11-8-8" /></>)
export const Users = make('Users', <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></>)
export const ChartLine = make('ChartLine', <><path d="M3 3v18h18" /><path d="m19 9-5 5-4-4-3 3" /></>)
export const Presentation = make('Presentation', <><path d="M2 3h20" /><path d="M21 3v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V3" /><path d="m7 21 5-5 5 5" /></>)
export const SlidersHorizontal = make('SlidersHorizontal', <><path d="M21 4h-7" /><path d="M10 4H3" /><path d="M21 12h-9" /><path d="M8 12H3" /><path d="M21 20h-5" /><path d="M12 20H3" /><path d="M14 2v4" /><path d="M8 10v4" /><path d="M16 18v4" /></>)
export const ArrowRightLeft = make('ArrowRightLeft', <><path d="m16 3 4 4-4 4" /><path d="M20 7H4" /><path d="m8 21-4-4 4-4" /><path d="M4 17h16" /></>)
export const ArrowDownWideNarrow = make('ArrowDownWideNarrow', <><path d="m3 16 4 4 4-4" /><path d="M7 20V4" /><path d="M11 4h10" /><path d="M11 8h7" /><path d="M11 12h4" /></>)
export const ClipboardCopy = make('ClipboardCopy', <><rect x="8" y="2" width="8" height="4" rx="1" /><path d="M8 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" /><path d="M16 4h2a2 2 0 0 1 2 2v4" /><path d="M21 14H11" /><path d="m15 10-4 4 4 4" /></>)
export const RotateCcw = make('RotateCcw', <><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /></>)
