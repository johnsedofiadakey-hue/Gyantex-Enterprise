const SEGMENTS = ["bg-olive", "bg-gold", "bg-teal", "bg-clay", "bg-terracotta", "bg-olive", "bg-gold", "bg-teal"];

export default function KenteStripe({ className = "" }: { className?: string }) {
  return (
    <div className={`flex h-[5px] w-full overflow-hidden ${className}`} aria-hidden="true">
      {SEGMENTS.map((color, index) => (
        <span key={index} className={`h-full flex-1 ${color}`} />
      ))}
    </div>
  );
}
