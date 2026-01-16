
import React, { useEffect, useState, useRef } from 'react';

interface Particle {
  id: number;
  x: number;
  y: number;
  color: string;
  size: number;
  dx: string;
  dy: string;
}

interface Props {
  active: boolean;
  spawnTrigger: number; // Increment this to spawn particles
  x?: number;
  y?: number;
  color?: string;
  fever?: boolean;
}

const EffectsLayer: React.FC<Props> = ({ active, spawnTrigger, x = 0, y = 0, color = '#00f0ff', fever = false }) => {
  const [particles, setParticles] = useState<Particle[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!active || spawnTrigger === 0) return;

    // Spawn burst of particles
    const newParticles: Particle[] = [];
    const count = fever ? 12 : 6;
    
    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const velocity = 20 + Math.random() * 60;
        const dx = `${Math.cos(angle) * velocity}px`;
        const dy = `${Math.sin(angle) * velocity}px`;
        
        newParticles.push({
            id: Date.now() + i + Math.random(),
            x: x + (Math.random() - 0.5) * 20,
            y: y + (Math.random() - 0.5) * 20,
            color: fever ? (Math.random() > 0.5 ? '#ff0055' : '#7000ff') : color,
            size: 4 + Math.random() * 6,
            dx,
            dy
        });
    }

    setParticles(prev => [...prev, ...newParticles]);

    // Cleanup after animation
    const timer = setTimeout(() => {
        setParticles(prev => prev.filter(p => !newParticles.find(np => np.id === p.id)));
    }, 1000);

    return () => clearTimeout(timer);
  }, [spawnTrigger, active, x, y, color, fever]);

  return (
    <div 
        ref={containerRef}
        style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            overflow: 'hidden',
            zIndex: 100
        }}
    >
        {particles.map(p => (
            <div
                key={p.id}
                className="particle"
                style={{
                    left: p.x,
                    top: p.y,
                    width: p.size,
                    height: p.size,
                    backgroundColor: p.color,
                    borderRadius: '50%',
                    boxShadow: `0 0 ${p.size * 2}px ${p.color}`,
                    //@ts-ignore
                    '--dx': p.dx,
                    '--dy': p.dy
                }}
            />
        ))}
         {fever && (
            <div style={{
                position: 'absolute',
                inset: 0,
                border: '2px solid rgba(255, 0, 85, 0.3)',
                boxShadow: 'inset 0 0 50px rgba(255, 0, 85, 0.2)',
                pointerEvents: 'none'
            }} />
        )}
    </div>
  );
};

export default EffectsLayer;
