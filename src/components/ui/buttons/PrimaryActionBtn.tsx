import React from 'react'
import { cn } from '@/lib/cn'

function PrimaryActionBtn({
  handleBtn,
  value,
  disabled = false,
  size = 'md',
}: {
  handleBtn: (e: React.MouseEvent<HTMLButtonElement>) => void
  value: string
  disabled?: boolean
  size?: 'md' | 'lg'
}) {
  return (
    <button
        type="button"
        onClick={handleBtn}
        disabled={disabled}
        className={cn(
          'my-1 w-full rounded-lg cursor-pointer bg-gradient-to-b from-primary to-primary/60 hover:to-primary/80 text-center font-bold text-on-primary hover:shadow-lg shadow-blue-900/20 transition duration-300',
          size === 'lg'
            ? 'px-3 py-2.5 text-sm sm:px-4 sm:py-2 sm:text-sm md:px-5 md:py-3 md:text-base'
            : 'px-3 py-1.5 text-sm md:px-5 md:py-3',
          disabled && 'opacity-50 cursor-not-allowed hover:to-primary/60',
        )}
        >
        {value}
    </button>
  )
}

export default PrimaryActionBtn
