import React from 'react'

function PrimaryOutLineBtn({handleBtn, value, disabled = false}: {handleBtn: () => void, value: string, disabled?: boolean}) {
  return (
    <button
        type="button"
        onClick={handleBtn}
        disabled={disabled}
        className={`my-2 w-full px-3 md:px-5 rounded-lg cursor-pointer border border-primary text-primary hover:bg-linear-to-bl hover:from-primary hover:to-primary/60 hover:text-on-primary py-1.5 md:py-3 text-center font-bold hover:shadow-lg shadow-blue-900/20 transition duration-300 ${
          disabled ? 'opacity-50 cursor-not-allowed hover:bg-transparent hover:text-primary' : ''
        }`}
        >
        {value}
    </button>
  )
}

export default PrimaryOutLineBtn