type AuthAlertProps = {
  variant: 'error' | 'success' | 'info'
  children: React.ReactNode
}

const VARIANT_CLASSES: Record<AuthAlertProps['variant'], string> = {
  error:
    'border-red-500/30 bg-red-500/10 text-red-300',
  success:
    'border-[#7c3aed]/30 bg-[#7c3aed]/10 text-[#c4b5fd]',
  info: 'border-white/[0.08] bg-white/[0.04] text-[#d4d4d8]',
}

export function AuthAlert({ variant, children }: AuthAlertProps) {
  return (
    <p
      role={variant === 'error' ? 'alert' : 'status'}
      className={`mt-6 rounded-lg border px-4 py-3 text-sm ${VARIANT_CLASSES[variant]}`}
    >
      {children}
    </p>
  )
}
