import { Card } from '@/components/shared/Card';
import { TrendingUp, BarChart3, DollarSign, Search } from 'lucide-react';

const benefits = [
  {
    icon: <TrendingUp className="w-6 h-6" />,
    title: 'Instant ROI & yield',
    description: 'Calculate cash-on-cash return, cap rate, and other key investment metrics instantly.',
  },
  {
    icon: <BarChart3 className="w-6 h-6" />,
    title: 'ImmoScore',
    description: 'Simple deal quality score that helps you quickly identify the best opportunities.',
  },
  {
    icon: <DollarSign className="w-6 h-6" />,
    title: 'Taxes & costs included',
    description: 'Comprehensive analysis including IPTU, condo fees, and all operating expenses.',
  },
  {
    icon: <Search className="w-6 h-6" />,
    title: 'Opportunity discovery',
    description: 'Find high-yield properties that match your investment criteria automatically.',
  },
];

export function BenefitsGrid() {
  return (
    <section className="py-16">
      <div className="text-center mb-12">
        <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
          Everything you need to invest with confidence
        </h2>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {benefits.map((benefit, index) => (
          <Card key={index} className="text-center shadow-sm shadow-white/50">
            <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-emerald-50 text-emerald-800 mx-auto mb-4">
              {benefit.icon}
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              {benefit.title}
            </h3>
            <p className="text-sm text-slate-700">
              {benefit.description}
            </p>
          </Card>
        ))}
      </div>
    </section>
  );
}

