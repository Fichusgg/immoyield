import Link from 'next/link';
import {
  Home,
  Calculator,
  BarChart3,
  TrendingUp,
  Briefcase,
} from 'lucide-react';
import { Button } from '../shared/Button';

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-200 bg-white/95 backdrop-blur-md shadow-sm">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center space-x-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-600 text-white">
              <BarChart3 className="w-5 h-5" />
            </div>
            <span className="text-xl font-bold text-slate-900">
              ImmoYield
            </span>
          </Link>
          
          <nav className="hidden md:flex items-center space-x-1">
            <Link href="/">
              <Button variant="ghost" size="sm">
                <Home className="w-4 h-4 mr-2" />
                Home
              </Button>
            </Link>

            <Link href="/opportunities">
              <Button variant="ghost" size="sm">
                <TrendingUp className="w-4 h-4 mr-2" />
                Opportunities
              </Button>
            </Link>

            <Link href="/analyze">
              <Button variant="ghost" size="sm">
                <Calculator className="w-4 h-4 mr-2" />
                Analyze
              </Button>
            </Link>

            <Link href="/portfolio">
              <Button variant="ghost" size="sm">
                <Briefcase className="w-4 h-4 mr-2" />
                Portfolio
              </Button>
            </Link>
          </nav>
          
          <div className="md:hidden">
            <Link href="/analyze">
              <Button variant="primary" size="sm">
                Analyze
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}

