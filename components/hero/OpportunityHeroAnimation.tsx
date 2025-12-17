'use client';

import { useEffect, useState, useRef } from 'react';

type FloatingCard = {
  id: number;
  city: string;
  neighborhood: string;
  price: number;
  score: number;
  x: number; // percentage
  y: number; // percentage
  driftX: number; // pixels to drift
  driftY: number; // pixels to drift
  duration: number; // seconds
  delay: number; // seconds
  createdAt: number; // timestamp for cleanup
};

const mockProperties = [
  { city: 'São Paulo', neighborhood: 'Pinheiros', price: 420000, score: 85 },
  { city: 'Rio de Janeiro', neighborhood: 'Copacabana', price: 580000, score: 88 },
  { city: 'São Paulo', neighborhood: 'Vila Madalena', price: 350000, score: 82 },
  { city: 'Campinas', neighborhood: 'Cambuí', price: 280000, score: 75 },
  { city: 'Florianópolis', neighborhood: 'Jurerê', price: 650000, score: 80 },
  { city: 'Belo Horizonte', neighborhood: 'Savassi', price: 450000, score: 78 },
  { city: 'Curitiba', neighborhood: 'Batel', price: 520000, score: 83 },
  { city: 'São Paulo', neighborhood: 'Itaim Bibi', price: 720000, score: 90 },
];

const MAX_CARDS = 12;
const SPAWN_INTERVAL_MIN = 350;
const SPAWN_INTERVAL_MAX = 700;
const ANIMATION_DURATION_MIN = 4;
const ANIMATION_DURATION_MAX = 7;

// Safe zone: avoid center area where hero content sits
// x: 25%-75%, y: 20%-70%
const SAFE_ZONE = {
  xMin: 25,
  xMax: 75,
  yMin: 20,
  yMax: 70,
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function getRandomPosition(): { x: number; y: number } {
  // Generate position outside safe zone
  const side = Math.random();
  let x: number, y: number;

  if (side < 0.25) {
    // Left side
    x = Math.random() * SAFE_ZONE.xMin;
    y = Math.random() * 100;
  } else if (side < 0.5) {
    // Right side
    x = SAFE_ZONE.xMax + Math.random() * (100 - SAFE_ZONE.xMax);
    y = Math.random() * 100;
  } else if (side < 0.75) {
    // Top
    x = Math.random() * 100;
    y = Math.random() * SAFE_ZONE.yMin;
  } else {
    // Bottom
    x = Math.random() * 100;
    y = SAFE_ZONE.yMax + Math.random() * (100 - SAFE_ZONE.yMax);
  }

  return { x, y };
}

function getScoreColor(score: number): string {
  if (score >= 80) return 'text-emerald-700 bg-emerald-50';
  if (score >= 70) return 'text-emerald-600 bg-emerald-50';
  return 'text-amber-700 bg-amber-50';
}

export function OpportunityHeroAnimation() {
  const [cards, setCards] = useState<FloatingCard[]>([]);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const nextIdRef = useRef(0);
  const spawnTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;
    
    // Check for reduced motion preference
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setReducedMotion(e.matches);
      if (e.matches) {
        // Clear all cards and stop spawning
        setCards([]);
        if (spawnTimeoutRef.current) {
          clearTimeout(spawnTimeoutRef.current);
        }
      }
    };

    mediaQuery.addEventListener('change', handleChange);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, [isMounted]);

  useEffect(() => {
    if (!isMounted) return;
    
    if (reducedMotion) {
      // Show 2-3 static cards without animation
      const staticCards: FloatingCard[] = [];
      for (let i = 0; i < 3; i++) {
        const property = mockProperties[i % mockProperties.length];
        const pos = getRandomPosition();
        staticCards.push({
          id: nextIdRef.current++,
          ...property,
          x: pos.x,
          y: pos.y,
          driftX: 0,
          driftY: 0,
          duration: 0,
          delay: 0,
          createdAt: Date.now(),
        });
      }
      setCards(staticCards);
      return;
    }

    const spawnCard = () => {
      setCards((prev) => {
        const now = Date.now();
        // Remove old cards that have finished animating (duration + 1s buffer)
        const activeCards = prev.filter(
          (card) => now - card.createdAt < (card.duration + 1) * 1000
        );

        if (activeCards.length >= MAX_CARDS) {
          return activeCards;
        }

        const property = mockProperties[Math.floor(Math.random() * mockProperties.length)];
        const pos = getRandomPosition();
        const duration = ANIMATION_DURATION_MIN + Math.random() * (ANIMATION_DURATION_MAX - ANIMATION_DURATION_MIN);
        const driftX = (Math.random() - 0.5) * 40; // -20 to +20px
        const driftY = (Math.random() - 0.5) * 40;

        const newCard: FloatingCard = {
          id: nextIdRef.current++,
          ...property,
          x: pos.x,
          y: pos.y,
          driftX,
          driftY,
          duration,
          delay: 0,
          createdAt: now,
        };

        return [...activeCards, newCard];
      });

      // Schedule next spawn
      const nextSpawn = SPAWN_INTERVAL_MIN + Math.random() * (SPAWN_INTERVAL_MAX - SPAWN_INTERVAL_MIN);
      spawnTimeoutRef.current = setTimeout(spawnCard, nextSpawn);
    };

    // Start spawning
    spawnCard();

    return () => {
      if (spawnTimeoutRef.current) {
        clearTimeout(spawnTimeoutRef.current);
      }
    };
  }, [reducedMotion, isMounted]);

  // Don't render until mounted to avoid hydration mismatch
  if (!isMounted) {
    return (
      <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 via-white to-emerald-50" />
      </div>
    );
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes gradient-shift {
            0%, 100% {
              background-position: 0% 50%;
            }
            50% {
              background-position: 100% 50%;
            }
          }
          @keyframes card-float {
            0% {
              opacity: 0;
              transform: translate(0, 0) scale(0.96);
            }
            10% {
              opacity: 0.9;
              transform: translate(0, 0) scale(1);
            }
            90% {
              opacity: 0.9;
            }
            100% {
              opacity: 0;
              transform: translate(var(--drift-x), var(--drift-y)) scale(0.98);
            }
          }
          .hero-gradient {
            background: linear-gradient(135deg, #d1fae5 0%, #ffffff 30%, #f0fdf4 60%, #d1fae5 100%);
            background-size: 200% 200%;
            animation: gradient-shift 15s ease infinite;
          }
          @media (prefers-reduced-motion: reduce) {
            .hero-gradient {
              animation: none;
            }
          }
          .hero-gradient::before {
            content: '';
            position: absolute;
            inset: 0;
            background-image: 
              repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.01) 2px, rgba(0,0,0,0.01) 4px);
            pointer-events: none;
          }
          .floating-card {
            animation: card-float var(--duration) ease-out forwards;
            animation-delay: var(--delay);
          }
        `
      }} />
      <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
        {/* Animated gradient background */}
        <div className="absolute inset-0 hero-gradient" />

        {/* Floating opportunity cards */}
        {cards.map((card) => (
          <div
            key={card.id}
            className={reducedMotion ? 'absolute' : 'floating-card absolute'}
            style={{
              left: `${card.x}%`,
              top: `${card.y}%`,
              opacity: reducedMotion ? 0.7 : undefined,
              '--drift-x': `${card.driftX}px`,
              '--drift-y': `${card.driftY}px`,
              '--duration': `${card.duration}s`,
              '--delay': `${card.delay}s`,
            } as React.CSSProperties & {
              '--drift-x': string;
              '--drift-y': string;
              '--duration': string;
              '--delay': string;
            }}
          >
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-white/50 shadow-sm p-2.5 w-28 transform -rotate-3">
              <div className="text-[10px] font-semibold text-slate-700 truncate mb-0.5">
                {card.neighborhood}
              </div>
              <div className="text-[9px] text-slate-500 mb-1 truncate">
                {card.city}
              </div>
              <div className="text-xs font-bold text-emerald-700 mb-1.5">
                {formatCurrency(card.price)}
              </div>
              <div className={`text-[9px] px-1.5 py-0.5 rounded-md font-medium ${getScoreColor(card.score)}`}>
                Score {card.score}
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

