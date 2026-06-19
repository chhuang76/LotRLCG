import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { PlayerCard } from '../engine/types';
import CardDisplay from './CardDisplay';
import './AllyCard.css';
// Allies are displayed the same way as heroes, so reuse the hero card styles.
import './HeroCard.css';

// ── Helper: Get image paths ─────────────────────────────────────────────────

function getPortraitImagePath(code: string): string {
    return `/cardPortraits/${code}.png`;
}

function getCardImagePath(code: string): string {
    return `/cards/${code}.png`;
}

export interface Ally extends PlayerCard {
    exhausted: boolean;
    damage: number;
}

interface AllyCardProps {
    ally: Ally;
    onExhaustToggle: () => void;
    highlighted?: boolean;
}

// ── Stat helper ────────────────────────────────────────────────────────────

const STAT_ICONS: Record<string, string> = {
    WIL: '🌟',
    ATK: '⚔',
    DEF: '🛡',
    HP: '❤',
};

function StatCell({ label, value }: { label: string; value?: number }) {
    return (
        <div className="hero-card__stat">
            <span className="hero-card__stat-icon">{STAT_ICONS[label]}</span>
            <span className="hero-card__stat-val">{value ?? '–'}</span>
        </div>
    );
}

// ── Main component ─────────────────────────────────────────────────────────

export function AllyCard({
    ally,
    onExhaustToggle,
    highlighted = false,
}: AllyCardProps) {
    const [isHovered, setIsHovered] = useState(false);
    const [zoomPosition, setZoomPosition] = useState<{ x: number; y: number } | null>(null);
    const [imgFailed, setImgFailed] = useState(false);
    const portraitRef = useRef<HTMLDivElement>(null);

    const maxHp = ally.health ?? 1;
    const sphereClass = ally.sphere_code ? `sphere-${ally.sphere_code}` : '';

    const pct = maxHp > 0 ? Math.min((ally.damage / maxHp) * 100, 100) : 0;
    const severity = pct >= 75 ? 'critical' : pct >= 40 ? 'wounded' : '';

    const portraitImagePath = getPortraitImagePath(ally.code);
    const cardImagePath = getCardImagePath(ally.code);
    const hasPortraitImage = !imgFailed;

    // Calculate zoom position when hovered
    useEffect(() => {
        if (isHovered && portraitRef.current) {
            const rect = portraitRef.current.getBoundingClientRect();
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;
            const zoomWidth = 280;
            const zoomHeight = 392;

            let x = rect.right + 12;
            let y = rect.top;

            if (x + zoomWidth > viewportWidth - 20) {
                x = rect.left - zoomWidth - 12;
            }

            if (y + zoomHeight > viewportHeight - 20) {
                y = viewportHeight - zoomHeight - 20;
            }

            if (y < 20) {
                y = 20;
            }

            if (x < 20) {
                x = Math.max(20, (viewportWidth - zoomWidth) / 2);
                y = rect.top - zoomHeight - 12;
                if (y < 20) {
                    y = rect.bottom + 12;
                }
            }

            setZoomPosition({ x, y });
        } else {
            setZoomPosition(null);
        }
    }, [isHovered]);

    return (
        <div className={`hero-card ${sphereClass} ${ally.exhausted ? 'exhausted' : ''} ${highlighted ? 'highlighted' : ''}`}>
            {/* Portrait - 1:1 square aspect ratio */}
            <div
                className="hero-card__portrait-wrap"
                ref={portraitRef}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
            >
                {hasPortraitImage ? (
                    <img
                        className="hero-card__portrait-image"
                        src={portraitImagePath}
                        alt={ally.name}
                        onError={() => setImgFailed(true)}
                    />
                ) : (
                    <CardDisplay
                        card={ally}
                        exhausted={ally.exhausted}
                        damage={ally.damage}
                        hideStats={true}
                    />
                )}
                {/* Name overlay at top of portrait */}
                <div className="hero-card__name-overlay">
                    <span className="hero-card__name">{ally.name}</span>
                    <span className="hero-card__sphere-text">{ally.sphere_code}</span>
                </div>
                {/* Stats overlay at bottom of portrait */}
                <div className="hero-card__stats-overlay">
                    <StatCell label="WIL" value={ally.willpower} />
                    <StatCell label="ATK" value={ally.attack} />
                    <StatCell label="DEF" value={ally.defense} />
                    <StatCell label="HP" value={ally.health} />
                </div>
            </div>

            {/* Zoomed card overlay */}
            {isHovered && zoomPosition && createPortal(
                <div
                    className="card-display__zoom-overlay"
                    style={{
                        left: zoomPosition.x,
                        top: zoomPosition.y,
                    }}
                    onMouseEnter={() => setIsHovered(false)}
                >
                    <div className={`card-display__zoom-card ${sphereClass}`}>
                        <img
                            className="card-display__zoom-image"
                            src={cardImagePath}
                            alt={ally.name}
                        />
                    </div>
                </div>,
                document.body
            )}

            {/* Damage row */}
            <div className="hero-card__resource-damage-row ally-card__damage-row">
                <div
                    className={`hero-card__damage-section ${severity}`}
                    title={`Damage: ${ally.damage} / ${maxHp} HP`}
                >
                    <span className="hero-card__damage-icon">💔</span>
                    <span className="hero-card__damage-value">{ally.damage}/{maxHp}</span>
                </div>
            </div>

            {/* Controls */}
            <div className="hero-card__controls">
                <button
                    className={`hero-card__exhaust-btn${ally.exhausted ? ' is-exhausted' : ''}`}
                    onClick={onExhaustToggle}
                >
                    {ally.exhausted ? '↺ Ready' : '↷ Exhaust'}
                </button>
            </div>
        </div>
    );
}

export default AllyCard;
