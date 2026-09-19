import React from 'react'
import Container from '@/components/common/Container'


const works = [
  {
    title: "Webknot",
    place: "Bengaluru, India (OnSite)"
  },
  {
    title: "Lno Mortgages",
    place: "Sydney, Australia (Remote)"
  },
]

const Work = () => {
  return (
    <Container className='flex flex-col justify-center gap-y-3'>
      <span className='text-lg sm:text-xl'>Work</span>
      <ul className='flex flex-col gap-y-3'>
        {works.map((work) => (
          <li
            key={work.title}
            className='flex items-baseline justify-between gap-x-4'
          >
            <span className='text-sm'>{work.title}</span>
            <span className='text-xs sm:text-sm text-muted-foreground text-right'>
              {work.place}
            </span>
          </li>
        ))}
      </ul>
    </Container>
  )
}

export default Work
