import React from "react";
import MoodboardGrid from "../gallery/MoodboardGrid";
import SmoothScrollArea from "../gallery/SmoothScrollArea";
import RansomHeading from "../gallery/ransom/RansomHeading";

const GalleryPage = () => {
  return (
    <div className="fixed inset-0 z-0">
      <SmoothScrollArea className="h-full pt-[40vh]">
        <RansomHeading
          text="my little gallery"
          className="mb-6 px-2 sm:mb-10 sm:px-4"
        />
        <MoodboardGrid />
      </SmoothScrollArea>
    </div>
  );
};

export default GalleryPage;
