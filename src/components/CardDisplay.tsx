import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { Card, EncounterCard, PlayerCard } from '../engine/types';
import './CardDisplay.css';

interface CardDisplayProps {
    card: Card;
    exhausted?: boolean;
    damage?: number;
    selected?: boolean;
    onClick?: () => void;
    disableZoom?: boolean;
    hideStats?: boolean;  // Hide stats in placeholder (used when parent shows stats separately)
}

// ── Helper: sphere class for player cards ──────────────────────────────────

function sphereClass(card: Card): string {
    if ('sphere_code' in card && card.sphere_code) {
        return `sphere-${card.sphere_code}`;
    }
    return '';
}

// ── Placeholder renderers ──────────────────────────────────────────────────

function EnemyPlaceholder({ card }: { card: EncounterCard }) {
    return (
        <div className={`card-display__placeholder type-enemy`}>
            {card.engagement_cost !== undefined && (
                <div className="card-display__engagement-badge">⚔ {card.engagement_cost}</div>
            )}
            <div className="card-display__type-banner">Enemy</div>
            <div className="card-display__placeholder-header">
                <span className="card-display__name">{card.name}</span>
            </div>
            {card.traits && <div className="card-display__traits">{card.traits}</div>}
            {card.text && (
                <div
                    className="card-display__text"
                    dangerouslySetInnerHTML={{ __html: card.text }}
                />
            )}
            <div className="card-display__stats">
                <div className="card-display__stat">
                    <span className="card-display__stat-label">THR</span>
                    <span className="card-display__stat-value">{card.threat ?? '–'}</span>
                </div>
                <div className="card-display__stat">
                    <span className="card-display__stat-label">ATK</span>
                    <span className="card-display__stat-value">{(card as EncounterCard).attack ?? '–'}</span>
                </div>
                <div className="card-display__stat">
                    <span className="card-display__stat-label">DEF</span>
                    <span className="card-display__stat-value">{(card as EncounterCard).defense ?? '–'}</span>
                </div>
                <div className="card-display__stat">
                    <span className="card-display__stat-label">HP</span>
                    <span className="card-display__stat-value">{(card as EncounterCard).health ?? '–'}</span>
                </div>
            </div>
        </div>
    );
}

function LocationPlaceholder({ card }: { card: EncounterCard }) {
    return (
        <div className="card-display__placeholder type-location">
            {card.quest_points !== undefined && (
                <div className="card-display__qp-badge">◆ {card.quest_points}</div>
            )}
            <div className="card-display__type-banner">Location</div>
            <div className="card-display__placeholder-header">
                <span className="card-display__name">{card.name}</span>
            </div>
            {card.traits && <div className="card-display__traits">{card.traits}</div>}
            {card.text && (
                <div
                    className="card-display__text"
                    dangerouslySetInnerHTML={{ __html: card.text }}
                />
            )}
            <div className="card-display__stats">
                <div className="card-display__stat">
                    <span className="card-display__stat-label">THR</span>
                    <span className="card-display__stat-value">{card.threat ?? '–'}</span>
                </div>
                <div className="card-display__stat">
                    <span className="card-display__stat-label">QP</span>
                    <span className="card-display__stat-value">{card.quest_points ?? '–'}</span>
                </div>
            </div>
        </div>
    );
}

function TreacheryPlaceholder({ card }: { card: EncounterCard }) {
    return (
        <div className="card-display__placeholder type-treachery">
            <div className="card-display__type-banner">Treachery</div>
            <div className="card-display__placeholder-header">
                <span className="card-display__name">{card.name}</span>
            </div>
            {card.traits && <div className="card-display__traits">{card.traits}</div>}
            {card.text && (
                <div
                    className="card-display__text"
                    dangerouslySetInnerHTML={{ __html: card.text }}
                />
            )}
        </div>
    );
}

function QuestPlaceholder({ card }: { card: EncounterCard }) {
    return (
        <div className="card-display__placeholder type-quest">
            <div className="card-display__placeholder-header">
                <span className="card-display__name">{card.name}</span>
                {card.stage !== undefined && (
                    <span className="card-display__stage-badge">Stage {card.stage}</span>
                )}
            </div>
            {card.text && (
                <div
                    className="card-display__text"
                    dangerouslySetInnerHTML={{ __html: card.text }}
                />
            )}
            {card.quest_points !== undefined && (
                <div className="card-display__stats">
                    <div className="card-display__stat">
                        <span className="card-display__stat-label">QP</span>
                        <span className="card-display__stat-value">{card.quest_points}</span>
                    </div>
                </div>
            )}
        </div>
    );
}

function PlayerPlaceholder({ card, hideStats = false }: { card: PlayerCard; hideStats?: boolean }) {
    const sc = sphereClass(card);
    const hasStats =
        !hideStats && (
            card.willpower !== undefined ||
            card.attack !== undefined ||
            card.defense !== undefined ||
            card.health !== undefined
        );

    return (
        <div className={`card-display__placeholder ${sc}`}>
            <div className="card-display__placeholder-header">
                <span className="card-display__name">{card.name}</span>
                {card.cost !== undefined && (
                    <span className="card-display__cost">{card.cost}</span>
                )}
            </div>
            <div className="card-display__type-banner">{card.type_code}</div>
            {card.traits && <div className="card-display__traits">{card.traits}</div>}
            {card.text && (
                <div
                    className="card-display__text"
                    dangerouslySetInnerHTML={{ __html: card.text }}
                />
            )}
            {hasStats && (
                <div className="card-display__stats">
                    {card.willpower !== undefined && (
                        <div className="card-display__stat">
                            <span className="card-display__stat-label">WIL</span>
                            <span className="card-display__stat-value">{card.willpower}</span>
                        </div>
                    )}
                    {card.attack !== undefined && (
                        <div className="card-display__stat">
                            <span className="card-display__stat-label">ATK</span>
                            <span className="card-display__stat-value">{card.attack}</span>
                        </div>
                    )}
                    {card.defense !== undefined && (
                        <div className="card-display__stat">
                            <span className="card-display__stat-label">DEF</span>
                            <span className="card-display__stat-value">{card.defense}</span>
                        </div>
                    )}
                    {card.health !== undefined && (
                        <div className="card-display__stat">
                            <span className="card-display__stat-label">HP</span>
                            <span className="card-display__stat-value">{card.health}</span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// ── Damage token dots ──────────────────────────────────────────────────────

function DamageTokens({ count }: { count: number }) {
    if (!count) return null;
    return (
        <div className="card-display__damage-tokens">
            {Array.from({ length: Math.min(count, 9) }).map((_, i) => (
                <span key={i} className="card-display__damage-token" />
            ))}
        </div>
    );
}

// ── Main component ─────────────────────────────────────────────────────────

export function CardDisplay({
    card,
    exhausted = false,
    damage = 0,
    selected = false,
    onClick,
    disableZoom = false,
    hideStats = false,
}: CardDisplayProps) {
    const [imgFailed, setImgFailed] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const [zoomPosition, setZoomPosition] = useState<{ x: number; y: number } | null>(null);
    const cardRef = useRef<HTMLDivElement>(null);

    const showImage = !!card.imagesrc && !imgFailed;

    // Calculate zoom position based on card position
    useEffect(() => {
        if (isHovered && cardRef.current && !disableZoom) {
            const rect = cardRef.current.getBoundingClientRect();
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;
            const zoomWidth = 280;
            const zoomHeight = 392;

            // Position zoomed card to the right of the original, unless it would go off-screen
            let x = rect.right + 12;
            let y = rect.top;

            // If zoomed card would go off right edge, position to the left
            if (x + zoomWidth > viewportWidth - 20) {
                x = rect.left - zoomWidth - 12;
            }

            // If zoomed card would go off bottom edge, adjust upward
            if (y + zoomHeight > viewportHeight - 20) {
                y = viewportHeight - zoomHeight - 20;
            }

            // Ensure it doesn't go above the viewport
            if (y < 20) {
                y = 20;
            }

            // If still can't fit on left, center it above/below
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
    }, [isHovered, disableZoom]);

    const classNames = [
        'card-display',
        exhausted ? 'exhausted' : '',
        selected ? 'selected' : '',
        isHovered && !disableZoom ? 'hovered' : '',
        sphereClass(card),
    ]
        .filter(Boolean)
        .join(' ');

    const renderPlaceholder = (isZoomed = false, showStatsInZoom = true) => {
        // When zoomed, always show stats; otherwise respect hideStats prop
        const shouldHideStats = isZoomed ? false : hideStats;
        switch (card.type_code) {
            case 'enemy':
                return <EnemyPlaceholder card={card as EncounterCard} />;
            case 'location':
                return <LocationPlaceholder card={card as EncounterCard} />;
            case 'treachery':
                return <TreacheryPlaceholder card={card as EncounterCard} />;
            case 'quest':
            case 'objective':
                return <QuestPlaceholder card={card as EncounterCard} />;
            default:
                return <PlayerPlaceholder card={card as PlayerCard} hideStats={shouldHideStats} />;
        }
    };

    const renderZoomedContent = () => {
        if (showImage) {
            return (
                <img
                    className="card-display__image"
                    src={card.imagesrc}
                    alt={card.name}
                />
            );
        }
        return renderPlaceholder(true);
    };

    return (
        <>
            <div
                ref={cardRef}
                className={classNames}
                onClick={onClick}
                title={card.name}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
            >
                {showImage ? (
                    <img
                        className="card-display__image"
                        src={card.imagesrc}
                        alt={card.name}
                        onError={() => setImgFailed(true)}
                        loading="lazy"
                    />
                ) : (
                    renderPlaceholder()
                )}
                <DamageTokens count={damage} />
            </div>

            {/* Zoomed card overlay - using Portal to escape parent transforms */}
            {isHovered && !disableZoom && zoomPosition && createPortal(
                <div
                    className="card-display__zoom-overlay"
                    style={{
                        left: zoomPosition.x,
                        top: zoomPosition.y,
                    }}
                    onMouseEnter={() => setIsHovered(false)}
                >
                    <div className={`card-display__zoom-card ${sphereClass(card)}`}>
                        {renderZoomedContent()}
                        <DamageTokens count={damage} />
                    </div>
                </div>,
                document.body
            )}
        </>
    );
}

export default CardDisplay;
