import type { ReactNode } from 'react';
import FadeInSection from './FadeInSection';

type Props = {
  id?: string;
  eyebrow?: string;
  title: string;
  subheading?: string;
  body: string;
  visual: ReactNode;
  reversed?: boolean;
};

/**
 * Alternating two-column feature section — editorial / Compass-style.
 * Text column max 480px. Visual column vertically centered.
 */
export default function FeatureSection({
  id,
  eyebrow,
  title,
  subheading,
  body,
  visual,
  reversed = false,
}: Props) {
  return (
    <section id={id} className="border-b border-[#E2E0DA] py-[100px]">
      <div className="mx-auto grid max-w-[1200px] grid-cols-1 gap-10 px-6 md:grid-cols-12 md:gap-8">
        {/* Text */}
        <FadeInSection
          className={`flex items-center md:col-span-6 ${reversed ? 'md:order-2' : ''}`}
        >
          <div className="flex max-w-[480px] flex-col gap-5">
            {eyebrow && (
              <p className="text-[11px] font-semibold tracking-[0.14em] text-[#9CA3AF] uppercase">
                {eyebrow}
              </p>
            )}
            <h2 className="text-[28px] font-bold leading-[1.15] tracking-tight text-[#1C2B20] md:text-[32px]">
              {title}
            </h2>
            {subheading && (
              <p className="text-base font-medium text-[#1C2B20]">{subheading}</p>
            )}
            <p className="text-[15px] leading-[1.65] text-[#6B7280]">{body}</p>
          </div>
        </FadeInSection>

        {/* Visual — slight extra delay so the eye moves text → visual */}
        <FadeInSection
          delay={0.12}
          className={`flex items-center justify-center md:col-span-6 ${reversed ? 'md:order-1' : ''}`}
        >
          <div className="w-full">{visual}</div>
        </FadeInSection>
      </div>
    </section>
  );
}

/** Card primitive — matches the app's sharp, editorial surface aesthetic. */
export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`border border-[#E2E0DA] bg-[#FAFAF8] p-6 shadow-[0_2px_8px_rgba(28,43,32,0.04)] transition-[transform,box-shadow,border-color] duration-500 ease-[cubic-bezier(0.25,0.1,0.25,1)] hover:-translate-y-0.5 hover:border-[#D0CEC8] hover:shadow-[0_12px_28px_rgba(28,43,32,0.08)] ${className}`}
    >
      {children}
    </div>
  );
}
