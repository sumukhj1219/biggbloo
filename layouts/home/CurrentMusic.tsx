import MusicPlayer from "@/components/ui/MusicPlayer";
import React, { forwardRef } from "react";

const CurrentMusic = forwardRef<HTMLDivElement>((_props, ref) => {
  return (
    <div className="flex items-center">
      <MusicPlayer ref={ref} />
    </div>
  );
});
CurrentMusic.displayName = "CurrentMusic";

export default CurrentMusic;
