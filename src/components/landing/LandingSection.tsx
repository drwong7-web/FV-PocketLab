import { useInView } from "@/hooks/useInView";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function LandingSection({
  id,
  children,
  className,
}: {
  id?: string;
  children: ReactNode;
  className?: string;
}) {
  const { ref, visible } = useInView<HTMLElement>();

  return (
    <section
      id={id}
      ref={ref}
      className={cn(
        "scroll-mt-24 py-16 sm:py-24",
        visible ? "animate-landing-reveal" : "opacity-0",
        "motion-reduce:opacity-100 motion-reduce:animate-none",
        className
      )}
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">{children}</div>
    </section>
  );
}
