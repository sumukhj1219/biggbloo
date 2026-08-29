"use client";
import { LinkPreview } from "../ui/link-preview";

const Contact = () => {
  return (
    <div className="grid grid-cols-4 grid-rows-1 gap-1.5 w-fit my-3 relative sm:grid-cols-2 sm:grid-rows-2 sm:gap-4 sm:w-32">
      {/* X / Twitter */}
      <div className="relative z-10">
        <LinkPreview
          url="https://x.com/biggbloo"
          className="font-bold text-neutral-800"
        >
          <span className="p-2 rounded-2xl size-12 sm:size-16 flex items-center justify-center mx-auto bg-linear-to-b from-white via-neutral-200 to-neutral-300 border-dashed inset-shadow-xs inset-shadow-blue-800 border-2 border-[#3754F8] shadow-sm relative">
            <img className="z-1 absolute size-6 sm:size-8 object-contain" src="/app/x.png" alt="X logo" />
          </span>
        </LinkPreview>
      </div>

      {/* LinkedIn */}
      <div className="relative z-10">
        <LinkPreview
          url="https://www.linkedin.com/in/sumukhj1219"
          className="font-bold text-neutral-800"
        >
          <span className="p-2 rounded-2xl size-12 sm:size-16 flex items-center justify-center mx-auto bg-linear-to-b from-white via-neutral-200 to-neutral-300 border-dashed inset-shadow-xs inset-shadow-blue-800 border-2 border-[#3754F8] shadow-sm relative">
            <img className="z-1 absolute size-6 sm:size-8 object-contain" src="/app/linkedin.png" alt="LinkedIn logo" />
          </span>
        </LinkPreview>
      </div>

      {/* GitHub */}
      <div className="relative z-20">
        <LinkPreview
          url="https://github.com/sumukhj1219"
          className="font-bold text-neutral-800"
        >
          <span className="p-2 rounded-2xl size-12 sm:size-16 flex items-center justify-center mx-auto bg-linear-to-b from-white via-neutral-200 to-neutral-300 border-dashed inset-shadow-xs inset-shadow-blue-800 border-2 border-[#3754F8] shadow-sm relative">
            <img className="z-1 absolute size-6 sm:size-8 object-contain" src="/app/github.png" alt="GitHub logo" />
          </span>
        </LinkPreview>
      </div>

      {/* Gmail */}
      <div className="relative z-10">
        <span className="p-2 rounded-2xl size-12 sm:size-16 flex items-center justify-center mx-auto bg-linear-to-b from-white via-neutral-200 to-neutral-300 border-dashed inset-shadow-xs inset-shadow-blue-800 border-2 border-[#3754F8] shadow-sm relative">
          <img className="z-1 absolute size-6 sm:size-8 h-8 object-contain" src="/app/gmail.png" alt="Gmail logo" />
        </span>
      </div>
    </div>
  );
};

export default Contact;
