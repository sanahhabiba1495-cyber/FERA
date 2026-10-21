export function SegmentProgress({
  total,
  current,
}: {
  total: number;
  current: number;
}) {
  return (
    <div className="flex gap-1.5" aria-hidden>
      {Array.from({ length: total }).map((_, index) => (
        <div
          key={index}
          className={`h-1 flex-1 rounded-full ${
            index <= current ? "bg-sage" : "bg-mist"
          }`}
        />
      ))}
    </div>
  );
}
