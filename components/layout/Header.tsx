import Link from 'next/link';
import { Home, Calculator, BarChart3 } from 'lucide-react';
import { Button } from '../shared/Button';

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center space-x-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-600 text-white">
              <BarChart3 className="w-5 h-5" />
            </div>
            <span className="text-xl font-bold text-gray-900 dark:text-gray-100">
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
            <Link href="/analyze">
              <Button variant="ghost" size="sm">
                <Calculator className="w-4 h-4 mr-2" />
                Analyze
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

