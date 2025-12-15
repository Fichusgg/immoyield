import Link from 'next/link';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/shared/Button';
import { Card } from '@/components/shared/Card';
import { Calculator, TrendingUp, BarChart3, DollarSign, Home as HomeIcon, Zap } from 'lucide-react';

export default function Home() {
  const features = [
    {
      icon: <Calculator className="w-6 h-6" />,
      title: 'Easy Analysis',
      description: 'Input your property details and get instant investment analysis with comprehensive metrics.',
    },
    {
      icon: <TrendingUp className="w-6 h-6" />,
      title: 'ROI Calculations',
      description: 'Calculate cash-on-cash return, cap rate, and other key investment metrics automatically.',
    },
    {
      icon: <BarChart3 className="w-6 h-6" />,
      title: 'Detailed Reports',
      description: 'View monthly and annual cash flow projections with detailed breakdowns.',
    },
    {
      icon: <DollarSign className="w-6 h-6" />,
      title: 'Financial Planning',
      description: 'Plan your real estate investments with accurate financial projections and analysis.',
    },
  ];

  return (
    <Layout>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Section */}
        <section className="text-center py-16 md:py-24">
          <div className="max-w-3xl mx-auto">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600 text-white mb-6">
              <HomeIcon className="w-8 h-8" />
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-gray-100 mb-6">
              Analyze Real Estate
              <span className="text-blue-600 dark:text-blue-400"> Investments</span>
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-400 mb-8 max-w-2xl mx-auto">
              Make informed investment decisions with comprehensive property analysis. 
              Calculate ROI, cash flow, and other key metrics instantly.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/analyze">
                <Button variant="primary" size="lg" className="w-full sm:w-auto">
                  <Calculator className="w-5 h-5 mr-2" />
                  Start Analysis
                </Button>
              </Link>
              <Button variant="outline" size="lg" className="w-full sm:w-auto">
                Learn More
              </Button>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              Everything You Need
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Powerful tools to analyze and evaluate real estate investment opportunities
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <Card key={index} className="text-center">
                <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 mx-auto mb-4">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {feature.description}
                </p>
              </Card>
            ))}
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16">
          <Card className="bg-gradient-to-r from-blue-600 to-blue-700 text-white border-0">
            <div className="text-center max-w-2xl mx-auto">
              <Zap className="w-12 h-12 mx-auto mb-4" />
              <h2 className="text-3xl font-bold mb-4">
                Ready to Analyze Your Property?
              </h2>
              <p className="text-blue-100 mb-8 text-lg">
                Get started with our comprehensive property analysis tool and make data-driven investment decisions.
              </p>
              <Link href="/analyze">
                <Button variant="secondary" size="lg">
                  Get Started Now
                </Button>
              </Link>
            </div>
          </Card>
        </section>
      </div>
    </Layout>
  );
}
