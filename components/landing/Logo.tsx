import { Mic } from "lucide-react";

type LogoProps = {
  className?: string;
};

export function Logo({ className = "" }: LogoProps) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#8b5cf6] shadow-[0_0_20px_rgba(139,92,246,0.35)]">
        <Mic className="h-4 w-4 text-white" strokeWidth={2.5} />
      </div>
      <span className="text-lg font-bold tracking-tight text-white">
        Podium AI
      </span>
    </div>
  );
}
