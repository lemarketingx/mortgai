// Shared icon set for the advisor CRM (FINZO PRO).
// Consistent stroke-based SVGs (Feather-style) so nothing renders as a raw
// emoji glyph — keeps every screen visually aligned with the header icons.
import { forwardRef } from "react";

function makeIcon(paths, defaultViewBox = "0 0 24 24") {
  const Icon = forwardRef(function IconInner({ size = 15, className = "", strokeWidth = 2, ...rest }, ref) {
    return (
      <svg
        ref={ref}
        width={size}
        height={size}
        viewBox={defaultViewBox}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        aria-hidden="true"
        {...rest}
      >
        {paths}
      </svg>
    );
  });
  return Icon;
}

export const HomeIcon = makeIcon(
  <>
    <path d="M3 11.5 12 4l9 7.5" />
    <path d="M5 9.5V20h14V9.5" />
    <path d="M9.5 20v-6h5v6" />
  </>
);

export const RefreshIcon = makeIcon(
  <>
    <path d="M21 12a9 9 0 0 1-15.3 6.4L3 16" />
    <path d="M3 12a9 9 0 0 1 15.3-6.4L21 8" />
    <path d="M3 21v-5h5" />
    <path d="M21 3v5h-5" />
  </>
);

export const TrendingUpIcon = makeIcon(
  <>
    <polyline points="3 17 9.5 10.5 14 15 21 7" />
    <polyline points="14 7 21 7 21 14" />
  </>
);

export const BuildingIcon = makeIcon(
  <>
    <rect x="4" y="3" width="10" height="18" rx="1" />
    <rect x="14" y="9" width="6" height="12" rx="1" />
    <line x1="7" y1="7" x2="7" y2="7.01" />
    <line x1="11" y1="7" x2="11" y2="7.01" />
    <line x1="7" y1="11" x2="7" y2="11.01" />
    <line x1="11" y1="11" x2="11" y2="11.01" />
    <line x1="7" y1="15" x2="7" y2="15.01" />
    <line x1="11" y1="15" x2="11" y2="15.01" />
  </>
);

export const AlertTriangleIcon = makeIcon(
  <>
    <path d="M12 3.5 22 20H2z" />
    <line x1="12" y1="9.5" x2="12" y2="14" />
    <line x1="12" y1="17" x2="12" y2="17.01" />
  </>
);

export const UserIcon = makeIcon(
  <>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 20c0-4 3.5-6.5 8-6.5s8 2.5 8 6.5" />
  </>
);

export const CreditCardIcon = makeIcon(
  <>
    <rect x="2.5" y="5.5" width="19" height="13" rx="2" />
    <line x1="2.5" y1="10" x2="21.5" y2="10" />
  </>
);

export const ClipboardIcon = makeIcon(
  <>
    <rect x="6" y="4.5" width="12" height="17" rx="1.5" />
    <rect x="9" y="2.5" width="6" height="3.5" rx="1" />
    <line x1="9" y1="11" x2="15" y2="11" />
    <line x1="9" y1="15" x2="15" y2="15" />
  </>
);

export const MapPinIcon = makeIcon(
  <>
    <path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" />
    <circle cx="12" cy="9.5" r="2.3" />
  </>
);

export const StoreIcon = makeIcon(
  <>
    <path d="M3.5 9 4.5 4h15l1 5" />
    <path d="M4 9v11h16V9" />
    <path d="M3.5 9a2.3 2.3 0 0 0 4.6 0 2.3 2.3 0 0 0 4.6 0 2.3 2.3 0 0 0 4.6 0 2.3 2.3 0 0 0 4.6 0" />
    <line x1="9.5" y1="20" x2="9.5" y2="14.5" />
    <line x1="14.5" y1="20" x2="14.5" y2="14.5" />
  </>
);

export const SettingsIcon = makeIcon(
  <>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09A1.65 1.65 0 0 0 15 4.6a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </>
);

export const CircleIcon = makeIcon(<circle cx="12" cy="12" r="9" />);

export const CheckCircleIcon = makeIcon(
  <>
    <path d="M21 11.5v.5a9 9 0 1 1-5.3-8.2" />
    <polyline points="21 4.5 12 13.5 9 10.5" />
  </>
);

export const CalendarIcon = makeIcon(
  <>
    <rect x="3.5" y="5" width="17" height="16" rx="2" />
    <line x1="16" y1="3" x2="16" y2="7" />
    <line x1="8" y1="3" x2="8" y2="7" />
    <line x1="3.5" y1="10" x2="20.5" y2="10" />
  </>
);

export const CalculatorIcon = makeIcon(
  <>
    <rect x="5" y="2.5" width="14" height="19" rx="2" />
    <line x1="8" y1="6.5" x2="16" y2="6.5" />
    <line x1="8" y1="11" x2="8" y2="11.01" />
    <line x1="12" y1="11" x2="12" y2="11.01" />
    <line x1="16" y1="11" x2="16" y2="11.01" />
    <line x1="8" y1="14.5" x2="8" y2="14.5" />
    <line x1="8" y1="14.5" x2="8" y2="14.51" />
    <line x1="12" y1="14.5" x2="12" y2="14.51" />
    <line x1="16" y1="14.5" x2="16" y2="18" />
    <line x1="8" y1="18" x2="8" y2="18.01" />
    <line x1="12" y1="18" x2="12" y2="18.01" />
  </>
);

export const StarIcon = makeIcon(
  <polygon points="12 2.5 15.1 8.8 22 9.8 17 14.6 18.2 21.5 12 18.2 5.8 21.5 7 14.6 2 9.8 8.9 8.8" />
);

export const StarFilledIcon = makeIcon(
  <polygon
    points="12 2.5 15.1 8.8 22 9.8 17 14.6 18.2 21.5 12 18.2 5.8 21.5 7 14.6 2 9.8 8.9 8.8"
    fill="currentColor"
  />
);

export const LandmarkIcon = makeIcon(
  <>
    <line x1="3" y1="21" x2="21" y2="21" />
    <line x1="4.5" y1="10" x2="4.5" y2="21" />
    <line x1="9.5" y1="10" x2="9.5" y2="21" />
    <line x1="14.5" y1="10" x2="14.5" y2="21" />
    <line x1="19.5" y1="10" x2="19.5" y2="21" />
    <polygon points="12 2.5 21 8 3 8" />
  </>
);

export const PhoneIcon = makeIcon(
  <path d="M6.6 10.8a15 15 0 0 0 6.6 6.6l2.2-2.2a1.5 1.5 0 0 1 1.5-.4 10.5 10.5 0 0 0 3.3.5 1.5 1.5 0 0 1 1.5 1.5V20a1.5 1.5 0 0 1-1.5 1.5A17.5 17.5 0 0 1 2.5 4a1.5 1.5 0 0 1 1.5-1.5h3.2a1.5 1.5 0 0 1 1.5 1.5 10.5 10.5 0 0 0 .5 3.3 1.5 1.5 0 0 1-.4 1.5z" />
);

export const MessageIcon = makeIcon(
  <path d="M21 11.5a7.5 7.5 0 0 1-7.5 7.5H9l-5 3 .8-4.9A7.5 7.5 0 1 1 21 11.5z" />
);

export const MailIcon = makeIcon(
  <>
    <rect x="2.5" y="5" width="19" height="14" rx="2" />
    <polyline points="3 6.5 12 13 21 6.5" />
  </>
);

export const EditIcon = makeIcon(
  <>
    <path d="M14.5 4.5 19 9l-9.5 9.5H5v-4.5z" />
    <line x1="13" y1="6" x2="17.5" y2="10.5" />
  </>
);

export const SearchIcon = makeIcon(
  <>
    <circle cx="10.5" cy="10.5" r="7" />
    <line x1="20.5" y1="20.5" x2="15.5" y2="15.5" />
  </>
);

export const PlusIcon = makeIcon(
  <>
    <line x1="12" y1="4" x2="12" y2="20" />
    <line x1="4" y1="12" x2="20" y2="12" />
  </>
);

export const XIcon = makeIcon(
  <>
    <line x1="5" y1="5" x2="19" y2="19" />
    <line x1="19" y1="5" x2="5" y2="19" />
  </>
);

export const CloudIcon = makeIcon(
  <path d="M6.5 19a4.5 4.5 0 0 1-.5-9 6 6 0 0 1 11.6-1.9A4.5 4.5 0 0 1 17 19z" />
);

export const DollarSignIcon = makeIcon(
  <>
    <line x1="12" y1="2" x2="12" y2="22" />
    <path d="M17 6.5c0-1.7-2.2-3-5-3s-5 1.3-5 3 2.2 2.7 5 3 5 1.3 5 3-2.2 3-5 3-5-1.3-5-3" />
  </>
);

export const ZapIcon = makeIcon(
  <polygon points="12.5 2 4 13.5 11 13.5 9.5 22 19 10 12 10" />
);

export const ColumnsIcon = makeIcon(
  <>
    <rect x="3" y="4" width="18" height="16" rx="1.5" />
    <line x1="9" y1="4" x2="9" y2="20" />
    <line x1="15" y1="4" x2="15" y2="20" />
  </>
);

export const GridIcon = makeIcon(
  <>
    <rect x="3.5" y="3.5" width="7.5" height="7.5" rx="1" />
    <rect x="13" y="3.5" width="7.5" height="7.5" rx="1" />
    <rect x="3.5" y="13" width="7.5" height="7.5" rx="1" />
    <rect x="13" y="13" width="7.5" height="7.5" rx="1" />
  </>
);

export const ListIcon = makeIcon(
  <>
    <line x1="8" y1="6" x2="21" y2="6" />
    <line x1="8" y1="12" x2="21" y2="12" />
    <line x1="8" y1="18" x2="21" y2="18" />
    <line x1="3.5" y1="6" x2="3.51" y2="6" />
    <line x1="3.5" y1="12" x2="3.51" y2="12" />
    <line x1="3.5" y1="18" x2="3.51" y2="18" />
  </>
);

export const PercentIcon = makeIcon(
  <>
    <line x1="19" y1="5" x2="5" y2="19" />
    <circle cx="7" cy="7" r="2.2" />
    <circle cx="17" cy="17" r="2.2" />
  </>
);
