import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement> & {
  d: string;
  size?: number;
  sw?: number;
};

const Icon = ({ d, size = 16, fill = 'none', stroke = 'currentColor', sw = 1.5, ...p }: IconProps) => (
  <svg
    viewBox="0 0 16 16"
    width={size}
    height={size}
    fill={fill}
    stroke={stroke}
    strokeWidth={sw}
    strokeLinecap="round"
    strokeLinejoin="round"
    {...p}
  >
    <path d={d} />
  </svg>
);

type P = Omit<SVGProps<SVGSVGElement>, 'children'> & { size?: number; sw?: number };

export const Icons = {
  Doc:    (p: P) => <Icon {...p} d="M4 2h5l3 3v9H4z M9 2v3h3" />,
  Plan:   (p: P) => <Icon {...p} d="M3 4h7 M3 8h10 M3 12h6" />,
  Agents: (p: P) => <Icon {...p} d="M5 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z M11 11a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z M2 14c0-1.7 1.3-3 3-3M14 14c0-1.7-1.3-3-3-3" />,
  Memory: (p: P) => <Icon {...p} d="M5 2.5C3.6 2.5 2.5 3.6 2.5 5v6c0 1.4 1.1 2.5 2.5 2.5h6c1.4 0 2.5-1.1 2.5-2.5V5 M5 5.5h6 M5 8h4 M5 10.5h6" />,
  Search: (p: P) => <Icon {...p} d="M11 11l3 3 M7 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z" />,
  Plus:   (p: P) => <Icon {...p} d="M8 3v10 M3 8h10" />,
  More:   (p: P) => <Icon {...p} d="M4 8h.01 M8 8h.01 M12 8h.01" sw={2} />,
  ChevD:  (p: P) => <Icon {...p} d="M4 6l4 4 4-4" />,
  Send:   (p: P) => <Icon {...p} d="M3 8l10-5-3 11-3-4-4-2z" />,
  Compress: (p: P) => <Icon {...p} d="M3 3h3v3 M10 3h3v3 M3 13h3v-3 M10 13h3v-3 M6 6l-2-2 M10 6l2-2 M6 10l-2 2 M10 10l2 2" />,
  Phone:  (p: P) => <Icon {...p} d="M5 1.5h6c.6 0 1 .4 1 1v11c0 .6-.4 1-1 1H5c-.6 0-1-.4-1-1v-11c0-.6.4-1 1-1Z M7 12.5h2" />,
  Share:  (p: P) => <Icon {...p} d="M4 7v6c0 .6.4 1 1 1h6c.6 0 1-.4 1-1V7 M8 1.5v8 M5.5 4 8 1.5 10.5 4" />,
  At:     (p: P) => <Icon {...p} d="M8 4.5a3.5 3.5 0 1 0 0 7c1 0 1.5-.3 2-.7 M11.5 8v.5a1.5 1.5 0 0 0 3 0V8a6.5 6.5 0 1 0-3 5.5" />,
  Branch: (p: P) => <Icon {...p} d="M4 2v10 M12 6v8 M4 6a4 4 0 0 0 4 4h0a4 4 0 0 1 4 4 M4 2a1 1 0 1 0 0 0Z M4 14a1 1 0 1 0 0 0Z M12 4a1 1 0 1 0 0 0Z" sw={1.4} />,
  Sync:   (p: P) => <Icon {...p} d="M3 8a5 5 0 0 1 9-3l1 1 M13 8a5 5 0 0 1-9 3l-1-1 M11 2v3h3 M2 11h3v3" sw={1.4} />,
  Decision: (p: P) => <Icon {...p} d="M8 1.5L14.5 8 8 14.5 1.5 8 8 1.5Z" />,
  Globe:  (p: P) => <Icon {...p} d="M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13Z M1.5 8h13 M8 1.5c2 2 2 11 0 13 M8 1.5c-2 2-2 11 0 13" />,
};
