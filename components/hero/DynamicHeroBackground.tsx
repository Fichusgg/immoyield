'use client';

import { useEffect, useState } from 'react';

type FloatingCard = {
  id: number;
  city: string;
  price: number;
  score: number;
  x: number;
  y: number;
  delay: number;
  duration: number;
};

const mockFloatingCards: Omit<FloatingCard, 'id' | 'x' | 'y' | 'delay' | 'duration'>[] = [
  { city: 'São Paulo', price: 350000, score: 85 },
  { city: 'Rio de Janeiro', price: 420000, score: 88 },
  { city: 'Campinas', price: 280000, score: 72 },
  { city: 'Florianópolis', price: 580000, score: 82 },
  { city: 'Belo Horizonte', price: 320000, score: 75 },
  { city: 'Curitiba', price: 450000, score: 80 },
];

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function DynamicHeroBackground() {
  const [cards, setCards] = useState<FloatingCard[]>([]);

  useEffect(() => {
    const generateCards = (): FloatingCard[] => {
      return mockFloatingCards.map((card, index) => ({
        ...card,
        id: index,
        x: Math.random() * 100,
        y: Math.random() * 100,
        delay: Math.random() * 2,
        duration: 15 + Math.random() * 10,
      }));
    };

    setCards(generateCards());

    const interval = setInterval(() => {
      setCards(generateCards());
    }, 20000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Animated gradient background */}
      <div 
        className="absolute inset-0 bg-gradient-to-br from-emerald-50 via-white to-emerald-50"
        style={{
          background: 'linear-gradient(135deg, #d1fae5 0%, #ffffff 50%, #d1fae5 100%)',
          backgroundSize: '200% 200%',
          animation: 'gradient-shift 10s ease infinite',
        }}
      />
      
      {/* Floating opportunity cards */}
      {cards.map((card) => (
        <div
          key={card.id}
          className="absolute opacity-20 hover:opacity-30 transition-opacity"
          style={{
            left: `${card.x}%`,
            top: `${card.y}%`,
            animation: `float ${card.duration}s ease-in-out infinite`,
            animationDelay: `${card.delay}s`,
          }}
        >
          <div className="bg-white rounded-lg shadow-md p-2 text-xs w-24 transform -rotate-6">
            <div className="font-semibold text-slate-700 truncate">{card.city}</div>
            <div className="text-emerald-700 font-medium">{formatCurrency(card.price)}</div>
            <div className="text-slate-500">Score: {card.score}</div>
          </div>
        </div>
      ))}

      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes gradient-shift {
            0%, 100% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
          }
          @keyframes float {
            0%, 100% { transform: translate(0, 0) rotate(-6deg); }
            25% { transform: translate(10px, -10px) rotate(-4deg); }
            50% { transform: translate(-10px, 10px) rotate(-8deg); }
            75% { transform: translate(5px, -5px) rotate(-5deg); }
          }
        `
      }} />
    </div>
  );
}

