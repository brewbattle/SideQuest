import { useEffect, useId, useRef, type ReactNode } from "react";
import {
  ArrowUpRight,
  BookOpen,
  Brain,
  ChartNoAxesCombined,
  Check,
  Landmark,
  Store,
  X,
  Zap,
} from "lucide-react";
import type { AppState } from "../lib/model";
export function CourseIcon({ id, size = 22 }: { id: string; size?: number }) {
  const Icon =
    id === "ECON110"
      ? ChartNoAxesCombined
      : id === "ECON127"
        ? Store
        : id === "PSYC260"
          ? Brain
          : Landmark;
  return <Icon size={size} strokeWidth={1.7} />;
}
export function Avatar({
  avatar,
  size = 56,
}: {
  avatar: AppState["avatar"];
  size?: number;
}) {
  const fills = {
    mint: "#c9edb6",
    lilac: "#d6c6f1",
    peach: "#f2c4a3",
    blue: "#b8d8ec",
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      role="img"
      aria-label={`${avatar.color} ${avatar.hat === "none" ? "" : avatar.hat} avatar`}
    >
      <rect
        x="3"
        y="3"
        width="94"
        height="94"
        rx="32"
        fill={fills[avatar.color]}
      />
      <path
        d="M22 78c-7-10-6-28-1-40 6-13 17-17 30-17 18 0 28 12 29 30 1 13-1 21-6 27"
        fill="#fff9e9"
        stroke="#284338"
        strokeWidth="2"
      />
      <ellipse cx="39" cy="51" rx="3" ry="4" fill="#284338" />
      <ellipse cx="62" cy="51" rx="3" ry="4" fill="#284338" />
      <path
        d="M44 63q7 7 14 0"
        fill="none"
        stroke="#284338"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      <ellipse cx="29" cy="60" rx="6" ry="3" fill="#efbfab" />
      <ellipse cx="72" cy="60" rx="6" ry="3" fill="#efbfab" />
      {avatar.hat === "sprout" && (
        <g stroke="#284338" strokeWidth="2">
          <path d="M50 26V12" />
          <path d="M50 18C34 19 36 4 50 18Z" fill="#8ebf7e" />
          <path d="M50 15C63 0 68 15 50 19Z" fill="#a3ca75" />
        </g>
      )}
      {avatar.hat === "star" && (
        <path
          d="m50 5 4 8 10 1-7 7 1 10-8-5-8 5 1-10-7-7 10-1z"
          fill="#f5cc59"
          stroke="#284338"
          strokeWidth="2"
        />
      )}
    </svg>
  );
}
export function Brand({ small = false }: { small?: boolean }) {
  return (
    <span className={`brand ${small ? "brand-small" : ""}`}>
      <span className="brand-mark">
        <Zap size={24} fill="currentColor" />
      </span>
      SideQuest<span className="brand-period">.</span>
    </span>
  );
}
let modalCount = 0;
let previousOverflow = "";
export function Dialog({
  title,
  children,
  onClose,
  wide = false,
  className = "",
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null),
    titleId = useId(),
    closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const prev = document.activeElement as HTMLElement;
    if (modalCount++ === 0) {
      previousOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    }
    ref.current?.focus();
    const handler = (e: KeyboardEvent) => {
      const ds = document.querySelectorAll('[role="dialog"]');
      if (ds[ds.length - 1] !== ref.current) return;
      if (e.key === "Escape") {
        e.preventDefault();
        closeRef.current();
      }
      if (e.key === "Tab") {
        const elements = [
          ...(ref.current?.querySelectorAll<HTMLElement>(
            'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"]',
          ) ?? []),
        ].filter((el) => el.getClientRects().length);
        const first = elements[0],
          last = elements.at(-1);
        if (!first) {
          e.preventDefault();
          return;
        }
        if (
          e.shiftKey &&
          (document.activeElement === first ||
            document.activeElement === ref.current)
        ) {
          e.preventDefault();
          last?.focus();
        } else if (
          !e.shiftKey &&
          (document.activeElement === last ||
            document.activeElement === ref.current)
        ) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", handler);
    return () => {
      if (--modalCount === 0) document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handler);
      if (prev?.isConnected) prev.focus();
    };
  }, []);
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`dialog ${wide ? "dialog-wide" : ""} ${className}`}
      >
        <div className="dialog-heading">
          <h2 id={titleId}>{title}</h2>
          <button
            className="icon-button"
            aria-label="Close dialog"
            onClick={onClose}
          >
            <X size={21} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
export function Empty({
  title,
  children,
  action,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <span className="empty-icon">
        <BookOpen size={30} />
      </span>
      <h3>{title}</h3>
      <p>{children}</p>
      {action}
    </div>
  );
}
export function Pill({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <span className={`pill ${className}`}>{children}</span>;
}
export function Tick() {
  return <Check size={16} />;
}
export function External() {
  return <ArrowUpRight size={15} />;
}
export function Island() {
  return (
    <svg
      className="island"
      viewBox="0 0 480 340"
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient
          id="land"
          x1="200"
          y1="140"
          x2="240"
          y2="320"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#c6dba3" />
          <stop offset="1" stopColor="#9fba7f" />
        </linearGradient>
        <pattern
          id="grid"
          width="38"
          height="38"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(-29)"
        >
          <rect width="38" height="38" fill="#c6dba3" />
          <rect width="19" height="19" fill="#d7e6b8" />
          <rect x="19" y="19" width="19" height="19" fill="#d7e6b8" />
        </pattern>
      </defs>
      <ellipse cx="252" cy="294" rx="157" ry="22" fill="#102d27" opacity=".5" />
      <path d="m70 215 185-97 176 97v32l-182 85-179-84z" fill="url(#land)" />
      <path d="m70 214 181-101 180 101-182 91z" fill="url(#grid)" />
      <path
        d="m249 305 1 25M92 250v-24m318 30v-30"
        stroke="#93ac74"
        strokeWidth="2"
      />
      <g className="float-one">
        <path d="m275 172 43-24 50 28v42l-44 24-49-28z" fill="#b3a0d4" />
        <path d="m275 172 45-25 48 29-44 25z" fill="#ded1ef" />
        <rect
          x="292"
          y="126"
          width="63"
          height="63"
          rx="12"
          transform="rotate(12 292 126)"
          fill="#ded1ef"
          stroke="#364b40"
          strokeWidth="2.5"
        />
        <rect
          x="301"
          y="139"
          width="44"
          height="25"
          rx="5"
          transform="rotate(12 301 139)"
          fill="#536956"
        />
        <path
          d="m310 149 5 5 10-7"
          stroke="#d5eeae"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path
          d="m307 178 9 2m-4-6-2 9"
          stroke="#536956"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <circle cx="335" cy="184" r="3" fill="#8c7fa8" />
      </g>
      <g>
        <path d="m121 211 65-37 72 37-67 38z" fill="#f3d29d" />
        <path d="m121 211 70 38v11l-70-38z" fill="#b57e53" />
        <path d="m191 249 67-38v11l-67 38z" fill="#e1ad72" />
        <path d="m128 208 59-31 65 33-61 33z" fill="#fff3d0" stroke="#bc9c70" />
        <path
          d="m185 178 5 63m-44-34 26 14m-17-23 25 13m25-9 24-12m-24 22 31-16"
          stroke="#b8bca1"
          strokeWidth="2"
        />
      </g>
      <g className="float-two">
        <path
          d="M196 172c-12-22-13-45-3-65 9-18 25-24 42-19 27 7 36 46 25 72l-7 16"
          fill="#f6f0ce"
          stroke="#294236"
          strokeWidth="2.5"
        />
        <path
          d="m196 171 9 4m40 0 9-1"
          stroke="#294236"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <ellipse cx="213" cy="125" rx="3.5" ry="5" fill="#294236" />
        <ellipse cx="239" cy="125" rx="3.5" ry="5" fill="#294236" />
        <path
          d="M218 142q8 9 15-1"
          stroke="#294236"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <ellipse cx="202" cy="137" rx="7" ry="4" fill="#e8bba2" />
        <ellipse cx="251" cy="137" rx="7" ry="4" fill="#e8bba2" />
        <path d="M224 90V66" stroke="#b5d384" strokeWidth="3" />
        <path
          d="M223 79c-28 0-22-24 0 0zm1-7c19-26 29-2 0 6z"
          fill="#c6e694"
          stroke="#294236"
          strokeWidth="1.8"
        />
      </g>
      <path d="m357 232 16 8-6 28-19-10z" fill="#d69a78" />
      <path
        d="M360 239v-41m-1 22c-25-20-10-31 1-9m2-5c18-23 28-9 0 9"
        fill="#94b987"
        stroke="#294236"
        strokeWidth="2.5"
      />
      <path d="m102 138 5 12 12 4-12 5-5 13-4-13-12-5 12-4z" fill="#d1ec9e" />
      <path d="m369 79 4 9 9 3-9 4-4 9-3-9-10-4 10-3z" fill="#ded1ef" />
      <circle cx="151" cy="76" r="5" stroke="#a9bc96" strokeWidth="2" />
      <path
        d="m405 146 5 5m0-5-5 5M310 66l6 6m0-6-6 6"
        stroke="#adc29a"
        strokeWidth="2"
      />
      <path d="m116 278 5 5m0-5-5 5" stroke="#ded1ef" strokeWidth="2" />
    </svg>
  );
}
