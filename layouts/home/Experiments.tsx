import Container from '@/components/common/Container'
import React from 'react'
import VideoCarousel, { type CarouselVideo } from '@/components/ui/VideoCarousel'

const experiments: CarouselVideo[] = [
  {
    id: 1,
    src: "/experiments/e1.mp4",
  },
  {
    id: 2,
    src: "/experiments/e2.mp4",
  },
  {
    id: 4,
    src: "/experiments/e4.mp4",
  },
  {
    id: 6,
    src: "/experiments/e6.mp4",
  },
  {
    id: 11,
    src: "/experiments/e11.mp4",
  },
  {
    id: 14,
    src: "/experiments/e14.mp4",
  },
  {
    id: 15,
    src: "/experiments/e15.mp4",
  },
  {
    id: 16,
    src: "/experiments/e16.mp4",
  },
  {
    id: 17,
    src: "/experiments/e17.mp4",
  },
]

const Experiments = () => {
  return (
    <Container className='flex flex-col justify-center gap-y-3'>
      <span className='text-lg sm:text-xl'>Experiments</span>
      <span className='text-sm text-muted-foreground'>
        Small builds to see what&apos;s possible, mostly Three.js and design. Here are a few.
      </span>
      <VideoCarousel videos={experiments} />
    </Container>
  )
}

export default Experiments
