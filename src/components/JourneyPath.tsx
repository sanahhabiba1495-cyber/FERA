import { JOURNEY_STEPS } from "@/lib/intake-options";

export function JourneyPath({ currentIndex }: { currentIndex: number }) {
  return (
    <ol className="mb-8 flex items-start justify-between gap-1">
      {JOURNEY_STEPS.map((label, index) => {
        const isCurrent = index === currentIndex;
        const isDone = index < currentIndex;

        return (
          <li key={label} className="flex flex-1 flex-col items-center text-center">
            <div className="mb-2 flex w-full items-center">
              <div
                className={`h-px flex-1 ${index === 0 ? "bg-transparent" : isDone || isCurrent ? "bg-terracotta" : "bg-mist"}`}
              />
              <span
                className={`flex h-3 w-3 shrink-0 rounded-full border-2 ${
                  isCurrent
                    ? "border-terracotta bg-terracotta"
                    : isDone
                      ? "border-terracotta bg-cream"
                      : "border-mist bg-cream"
                }`}
              />
              <div
                className={`h-px flex-1 ${index === JOURNEY_STEPS.length - 1 ? "bg-transparent" : isDone ? "bg-terracotta" : "bg-mist"}`}
              />
            </div>
            <span
              className={`text-[11px] leading-tight sm:text-xs ${
                isCurrent ? "font-medium text-terracotta" : "text-muted"
              }`}
            >
              {label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
