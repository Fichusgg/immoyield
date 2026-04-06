'use client';

export type WizardStep = {
  id: string;
  title: string;
  subtitle: string;
};

export function AddDealStepper({
  steps,
  activeIndex,
  onStepClick,
}: {
  steps: WizardStep[];
  activeIndex: number;
  onStepClick?: (index: number) => void;
}) {
  return (
    <div className="grid grid-cols-4 overflow-hidden rounded-2xl border border-[#e5e5e3] bg-white">
      {steps.map((step, idx) => {
        const active = idx === activeIndex;
        const clickable = !!onStepClick;
        return (
          <button
            key={step.id}
            type="button"
            onClick={() => onStepClick?.(idx)}
            disabled={!clickable}
            className={[
              'group flex flex-col gap-0.5 border-r border-[#e5e5e3] px-5 py-4 text-left transition-colors last:border-r-0',
              active ? 'bg-blue-600 text-white' : 'bg-[#f5f5f3] text-[#1a1a1a] hover:bg-white',
              clickable ? 'disabled:opacity-100' : 'cursor-default',
            ].join(' ')}
          >
            <span className="text-xs font-bold">{step.title}</span>
            <span className={['text-[10px] leading-tight', active ? 'text-white/75' : 'text-[#737373]'].join(' ')}>
              {step.subtitle}
            </span>
          </button>
        );
      })}
    </div>
  );
}

