import React from 'react'
import Container from '@/components/common/Container'


const works = [
  {
    title: "Webknot",
    place: "Bengaluru, India (OnSite)",
    current: true
  },
  {
    title: "Lno Mortgages",
    place: "Sydney, Australia (Remote)",
    current: false
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
            <span className='flex items-center gap-x-2 text-xs sm:text-sm text-muted-foreground'>
              {work.title}
              {work.current && (
                <span
                  role='img'
                  aria-label='Current'
                  className='size-1.5 rounded-full bg-green-500'
                />
              )}
            </span>
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
