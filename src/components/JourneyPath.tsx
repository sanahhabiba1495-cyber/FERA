import { JOURNEY_STEPS } from "@/lib/intake-options";

const ICONS = [
  // about
  <path
    key="a"
    d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm0 2c-4 0-7 2-7 4v1h14v-1c0-2-3-4-7-4Z"
  />,
  // cycle
  <path
    key="c"
    d="M12 3c2.5 3.5 6 6.2 6 10a6 6 0 1 1-12 0c0-2.2 1.2-4.4 3-6.2"
  />,
  // symptoms
  <path
    key="s"
    d="M4 12h2l2-4 3 8 2-4h7"
  />,
  // lifestyle
  <path
    key="l"
    d="M13 5a2 2 0 1 1-2 2M8 21l2-6 3 2 2-7 3 3 2-5"
  />,
  // goals
  <path
    key="g"
    d="M12 21a9 9 0 1 0-9-9m9 0a5 5 0 1 0-5-5m5 5a1.5 1.5 0 1 0-1.5-1.5"
  />,
  // treatments
  <path
    key="t"
    d="M9.5 4.5 19 14l-4 4L5.5 8.5a3 3 0 0 1 4-4Z"
  />,
  // reports
  <path
    key="r"
    d="M7 3h7l4 4v14H7V3Zm7 0v4h4M9 12h6M9 16h6"
  />,
];

export function JourneyRoadmap({ activeIndex = 0 }: { activeIndex?: number }) {
  return (
    <div className="rounded-3xl bg-paper p-5 shadow-sm ring-1 ring-mist">
      <ol className="relative space-y-0">
        {JOURNEY_STEPS.map((step, index) => {
          const isActive = index === activeIndex;
          const isPast = index < activeIndex;
          return (
            <li key={step.key} className="relative flex gap-4 pb-5 last:pb-0">
              {index < JOURNEY_STEPS.length - 1 ? (
                <span
                  className={`absolute left-[17px] top-9 h-[calc(100%-20px)] w-px ${
                    isPast || isActive ? "bg-sage/40" : "bg-mist"
                  }`}
                  aria-hidden
                />
              ) : null}
              <span
                className={`relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border ${
                  isActive
                    ? "border-sage bg-sage text-paper"
                    : isPast
                      ? "border-sage/50 bg-info text-sage"
                      : "border-mist bg-cream text-muted"
                }`}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  {ICONS[index]}
                </svg>
              </span>
              <div className="min-w-0 flex-1 pt-1">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p
                      className={`font-medium ${isActive ? "text-charcoal" : "text-charcoal/90"}`}
                    >
                      {step.title}
                    </p>
                    <p className="text-sm text-muted">{step.description}</p>
                  </div>
                  <span className="text-sm text-muted">{index + 1}</span>
                </div>
              </div>
              {isActive ? (
                <span
                  className="absolute -left-1 top-3 h-2 w-2 rounded-full bg-terracotta"
                  aria-hidden
                />
              ) : null}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/** Compact segment progress used on question screens. */
export function JourneyPath({ currentIndex }: { currentIndex: number }) {
  return (
    <div className="mb-6 flex gap-1.5" aria-hidden>
      {JOURNEY_STEPS.map((step, index) => (
        <div
          key={step.key}
          className={`h-1 flex-1 rounded-full ${
            index <= currentIndex ? "bg-sage" : "bg-mist"
          }`}
        />
      ))}
    </div>
  );
}
