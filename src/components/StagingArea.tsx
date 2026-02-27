import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { EncounterCard } from '../engine/types';
import CardDisplay from './CardDisplay';
import './StagingArea.css';

interface StagingAreaProps {
    cards: EncounterCard[];
    onCardClick?: (card: EncounterCard, index: number) => void;
    isTravelPhase?: boolean;
    hasActiveLocation?: boolean;
}

// ── Helper: Get image paths ─────────────────────────────────────────────────

function getPortraitImagePath(code: string): string {
    return `/cardPortraits/${code}.png`;
}

function getCardImagePath(code: string): string {
    return `/cards/${code}.png`;
}

// ── Stat icons ──────────────────────────────────────────────────────────────

const STAT_ICONS: Record<string, string> = {
    THR: '☠',
    ATK: '⚔',
    DEF: '🛡',
    HP: '❤',
    ENG: '👁',
};

function StatCell({ label, value }: { label: string; value?: number }) {
    return (
        <div className="staging-enemy__stat">
            <span className="staging-enemy__stat-icon">{STAT_ICONS[label]}</span>
            <span className="staging-enemy__stat-val">{value ?? '–'}</span>
        </div>
    );
}

// ── Staging Enemy Card (portrait-based) ─────────────────────────────────────

interface StagingEnemyCardProps {
    card: EncounterCard;
}

function StagingEnemyCard({ card }: StagingEnemyCardProps) {
    const [isHovered, setIsHovered] = useState(false);
    const [imgFailed, setImgFailed] = useState(false);
    const [zoomPosition, setZoomPosition] = useState<{ x: number; y: number } | null>(null);
    const portraitRef = useRef<HTMLDivElement>(null);

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
        <div className="staging-enemy">
            {/* Portrait with overlays */}
            <div
                className="staging-enemy__portrait-wrap"
                ref={portraitRef}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
            >
                {hasPortraitImage ? (
                    <img
                        className="staging-enemy__portrait-image"
                        src={portraitImagePath}
                        alt={card.name}
                        onError={() => setImgFailed(true)}
                    />
                ) : (
                    <CardDisplay card={card} />
                )}

                {/* Name & Traits overlay at top with engagement badge */}
                {hasPortraitImage && (
                    <div className="staging-enemy__name-overlay">
                        {card.engagement_cost !== undefined && (
                            <div className="staging-enemy__engagement-badge" title="Engagement Cost">
                                <span className="staging-enemy__engagement-icon">👁</span>
                                {card.engagement_cost}
                            </div>
                        )}
                        <div className="staging-enemy__name-wrap">
                            <span className="staging-enemy__name">{card.name}</span>
                            {card.traits && (
                                <span className="staging-enemy__traits">{card.traits}</span>
                            )}
                        </div>
                    </div>
                )}

                {/* Stats overlay at bottom */}
                {hasPortraitImage && (
                    <div className="staging-enemy__stats-overlay">
                        <StatCell label="THR" value={card.threat} />
                        <StatCell label="ATK" value={card.attack} />
                        <StatCell label="DEF" value={card.defense} />
                        <StatCell label="HP" value={card.health} />
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
        </div>
    );
}

export function StagingArea({ cards, onCardClick, isTravelPhase, hasActiveLocation }: StagingAreaProps) {
    const totalThreat = cards.reduce((sum, c) => sum + (c.threat ?? 0), 0);

    // Check if a card is a location that can be traveled to
    const canTravelTo = (card: EncounterCard): boolean => {
        return isTravelPhase === true && !hasActiveLocation && card.type_code === 'location';
    };

    return (
        <div className="staging-area">
            <div className="staging-area__header">
                <span className="staging-area__title">Staging Area</span>
                <span className="staging-area__threat-badge">
                    <span className="staging-area__threat-badge-icon">☠</span>
                    Threat: {totalThreat}
                </span>
            </div>

            {isTravelPhase && !hasActiveLocation && (
                <div className="staging-area__travel-hint">
                    🚶 Click a location to travel there
                </div>
            )}

            <div className="staging-area__cards">
                {cards.length === 0 ? (
                    <div className="staging-area__empty">No cards revealed</div>
                ) : (
                    cards.map((card, i) => {
                        const travelable = canTravelTo(card);
                        const isEnemy = card.type_code === 'enemy';

                        return (
                            <div
                                key={`${card.code}-${i}`}
                                className={`staging-area__card-wrapper ${travelable ? 'travelable' : ''}`}
                                onClick={() => {
                                    if (travelable) {
                                        onCardClick?.(card, i);
                                    }
                                }}
                            >
                                {isEnemy ? (
                                    <StagingEnemyCard card={card} />
                                ) : (
                                    <CardDisplay card={card} />
                                )}
                                {travelable && (
                                    <div className="staging-area__travel-badge">🚶 Travel</div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}

export default StagingArea;
