import SelectionTooltip from "@/components/common/SelectionTooltip";

export default function WritingsLayout({ children }: LayoutProps<"/writings">) {
  return (
    <>
      {children}
      <SelectionTooltip />
    </>
  );
}
