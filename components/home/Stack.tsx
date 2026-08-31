"use client";

import React from 'react'


const Stack = () => {
  return (
    <div
      className="flex flex-col items-center aspect-square w-[calc(50%-10px)] sm:aspect-auto sm:w-64 sm:h-48"
    >
      <div className='flex items-center gap-1 sm:gap-2'>
        <span className="text-secondary text-[16px] sm:text-sm">my daily</span>
        <span className="text-primary text-[16px] sm:text-sm">tool stack</span>
      </div>
      <img className='w-full sm:w-10/12 h-full' src="/app/stack.png" alt="tool stack" />
    </div>
  )
}

export default Stack
