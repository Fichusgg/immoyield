import Link from 'next/link';
import { Card } from '@/components/shared/Card';
import { Button } from '@/components/shared/Button';
import { Calculator, TrendingUp } from 'lucide-react';

export function FinalCTA() {
  return (
    <section className="py-16">
      <Card className="bg-gradient-to-r from-emerald-600 to-emerald-700 text-white border-0 shadow-lg shadow-emerald-200/50">
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to see if a property is a good investment?
          </h2>
          <p className="text-emerald-50 mb-8 text-lg">
            Get comprehensive analysis with ROI calculations, cash flow projections, and investment metrics in seconds.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/analyze">
              <Button variant="secondary" size="lg">
                <Calculator className="w-5 h-5 mr-2" />
                Try the analysis
              </Button>
            </Link>
            <Link href="/opportunities">
              <Button variant="outline" size="lg" className="bg-white/10 border-white/30 text-white hover:bg-white/20">
                <TrendingUp className="w-5 h-5 mr-2" />
                Browse opportunities
              </Button>
            </Link>
          </div>
        </div>
      </Card>
    </section>
  );
}

