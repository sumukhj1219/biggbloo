import React from 'react'

interface ContainerProps extends React.ComponentPropsWithoutRef<'div'> {
  children: React.ReactNode
}

const Container = ({ className, children, ...props }: ContainerProps) => {
  return (
    <div className={className} {...props}>
      {children}
    </div>
  )
}

export default Container
