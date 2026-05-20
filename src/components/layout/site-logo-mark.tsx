type SiteLogoMarkProps = {
  className?: string;
  title?: string;
};

export function SiteLogoMark({ className, title }: SiteLogoMarkProps) {
  return (
    <svg
      className={className}
      viewBox="15.2 15.2 225.6 225.6"
      fill="none"
      shapeRendering="geometricPrecision"
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      xmlns="http://www.w3.org/2000/svg"
    >
      {title ? <title>{title}</title> : null}
      <rect
        x="19"
        y="19"
        width="218"
        height="218"
        rx="31"
        fill="#171920"
        stroke="#5F5545"
        strokeWidth="6.8"
      />
      <path
        d="M52.5 77.8C82.4 70.4 107.1 73.2 128 89.4C148.9 73.2 173.6 70.4 203.5 77.8V185.1C173.6 176.5 148.9 179.5 128 194.1C107.1 179.5 82.4 176.5 52.5 185.1V77.8Z"
        fill="none"
        stroke="#6E6250"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="6.2"
      />
      <path
        d="M128 89.4V194.1"
        stroke="#6E6250"
        strokeLinecap="round"
        strokeWidth="4.2"
      />
      <path
        d="M83.2 93.4H173.8L82.9 162.5H169.6"
        stroke="#D9B861"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="22"
      />
      <circle cx="82.7" cy="93.4" r="8.8" fill="#171920" stroke="#D9B861" strokeWidth="2.6" />
      <circle cx="173.7" cy="162.6" r="13.2" fill="#C59B4A" />
    </svg>
  );
}
