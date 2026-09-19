import React from 'react'
import { cn } from '@/lib/utils'

const Container = ({
  className,
  children,
  ...props
}: React.ComponentProps<'div'>) => {
  return (
    <div className={cn('', className)} {...props}>
      {children}
    </div>
  )
}

export default Container
