export function AuthDivider() {
  return (
    <div className="relative py-2">
      <div className="absolute inset-0 flex items-center" aria-hidden>
        <div className="w-full border-t border-white/[0.08]" />
      </div>
      <p className="relative text-center text-xs text-[#71717a]">
        <span className="bg-[#13131a] px-3">or</span>
      </p>
    </div>
  )
}
