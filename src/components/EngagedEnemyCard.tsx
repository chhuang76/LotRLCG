import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { ActiveEnemy } from '../engine/types';
import CardDisplay from './CardDisplay';
import './EngagedEnemyCard.css';

interface EngagedEnemyCardProps {
    enemy: ActiveEnemy;
}

// ── Helper: Get image paths ─────────────────────────────────────────────────

/**
 * Gets the path to a portrait image in the public/cardPortraits folder.
 * Uses code-only naming convention: {code}.png
 */
function getPortraitImagePath(code: string): string {
    return `/cardPortraits/${code}.png`;
}

/**
 * Gets the path to a card image in the public/cards folder.
 * Uses code-only naming convention: {code}.png
 */
function getCardImagePath(code: string): string {
    return `/cards/${code}.png`;
}

// ── Stat icons ──────────────────────────────────────────────────────────────

const STAT_ICONS: Record<string, string> = {
    THR: '☠',
    ATK: '⚔',
    DEF: '🛡',
    HP: '❤',
};

function StatCell({ label, value }: { label: string; value?: number }) {
    return (
        <div className="engaged-enemy__stat">
            <span className="engaged-enemy__stat-icon">{STAT_ICONS[label]}</span>
            <span className="engaged-enemy__stat-val">{value ?? '–'}</span>
        </div>
    );
}

/**
 * Displays an engaged enemy with portrait image, overlays, and shadow cards.
 */
export function EngagedEnemyCard({ enemy }: EngagedEnemyCardProps) {
    const [isHovered, setIsHovered] = useState(false);
    const [imgFailed, setImgFailed] = useState(false);
    const [zoomPosition, setZoomPosition] = useState<{ x: number; y: number } | null>(null);
    const portraitRef = useRef<HTMLDivElement>(null);

    const hasShadowCards = enemy.shadowCards.length > 0;
    const card = enemy.card;

    const portraitImagePath = getPortraitImagePath(card.code);
    const cardImagePath = getCardImagePath(card.code);
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
        <div className="engaged-enemy">
            {/* Portrait with overlays */}
            <div
                className="engaged-enemy__portrait-wrap"
                ref={portraitRef}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
            >
                {hasPortraitImage ? (
                    <img
                        className="engaged-enemy__portrait-image"
                        src={portraitImagePath}
                        alt={card.name}
                        onError={() => setImgFailed(true)}
                    />
                ) : (
                    <CardDisplay card={card} damage={enemy.damage} />
                )}

                {/* Name & Traits overlay at top */}
                {hasPortraitImage && (
                    <div className="engaged-enemy__name-overlay">
                        <span className="engaged-enemy__name">{card.name}</span>
                        {card.traits && (
                            <span className="engaged-enemy__traits">{card.traits}</span>
                        )}
                    </div>
                )}

                {/* Stats overlay at bottom */}
                {hasPortraitImage && (
                    <div className="engaged-enemy__stats-overlay">
                        <StatCell label="THR" value={card.threat} />
                        <StatCell label="ATK" value={card.attack} />
                        <StatCell label="DEF" value={card.defense} />
                        <StatCell label="HP" value={card.health} />
                    </div>
                )}

                {/* Damage badge */}
                {enemy.damage > 0 && (
                    <div className="engaged-enemy__damage-badge">
                        💔 {enemy.damage}
                    </div>
                )}
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
                    <div className="card-display__zoom-card type-enemy">
                        <img
                            className="card-display__zoom-image"
                            src={cardImagePath}
                            alt={card.name}
                        />
                    </div>
                </div>,
                document.body
            )}

            {/* Shadow cards indicator */}
            {hasShadowCards && (
                <div className="engaged-enemy__shadow-stack">
                    {enemy.shadowCards.map((shadowCard, i) => (
                        <div
                            key={`shadow-${i}`}
                            className="engaged-enemy__shadow-card"
                            title={shadowCard.shadow ? `Shadow: ${shadowCard.shadow}` : 'No shadow effect'}
                        >
                            <div className="engaged-enemy__shadow-back">
                                <span className="engaged-enemy__shadow-icon">🌑</span>
                            </div>
                        </div>
                    ))}
                    <span className="engaged-enemy__shadow-label">
                        {enemy.shadowCards.length} Shadow
                    </span>
                </div>
            )}
        </div>
    );
}

export default EngagedEnemyCard;
