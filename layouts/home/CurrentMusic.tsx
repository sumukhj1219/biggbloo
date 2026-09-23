import MusicPlayer from "@/components/ui/MusicPlayer";
import React, { forwardRef } from "react";

// Forwards straight to MusicPlayer's own root, not this wrapper div — this
// div stretches to the full flex-column parent's width (flex children
// default to stretch on the cross axis), which is fine visually but would
// be the wrong thing to measure for anything that needs the actual disc's
// tight bounds (e.g. positioning a 3D model over it).
const CurrentMusic = forwardRef<HTMLDivElement>((_props, ref) => {
  return (
    <div className="flex items-center">
      <MusicPlayer ref={ref} />
    </div>
  );
});
CurrentMusic.displayName = "CurrentMusic";

export default CurrentMusic;
