type AuthFormPanelProps = {
  children: React.ReactNode
}

export function AuthFormPanel({ children }: AuthFormPanelProps) {
  return (
    <div className="w-full max-w-md rounded-xl border border-white/[0.06] bg-[#13131a] p-8 sm:p-10">
      {children}
    </div>
  )
}
