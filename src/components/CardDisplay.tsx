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

// ── Helper: Get RingsDB card image path ───────────────────────────────────────

/**
 * Map of card codes to their RingsDB image filenames.
 * Only player cards (01001-01073) have images available.
 */
const CARD_IMAGE_FILENAMES: Record<string, string> = {
    '01001': '01001_Aragorn.png',
    '01002': '01002_Théodred.png',
    '01003': '01003_Glóin.png',
    '01004': '01004_Gimli.png',
    '01005': '01005_Legolas.png',
    '01006': '01006_Thalin.png',
    '01007': '01007_Éowyn.png',
    '01008': '01008_Eleanor.png',
    '01009': '01009_Dúnhere.png',
    '01010': '01010_Denethor.png',
    '01011': '01011_Glorfindel.png',
    '01012': '01012_Beravor.png',
    '01013': '01013_Guard_of_the_Citadel.png',
    '01014': '01014_Faramir.png',
    '01015': '01015_Son_of_Arnor.png',
    '01016': '01016_Snowbourn_Scout.png',
    '01017': '01017_Silverlode_Archer.png',
    '01018': '01018_Longbeard_Orc_Slayer.png',
    '01019': '01019_Brok_Ironfist.png',
    '01020': '01020_Ever_Vigilant.png',
    '01021': '01021_Common_Cause.png',
    '01022': '01022_For_Gondor!.png',
    '01023': '01023_Sneak_Attack.png',
    '01024': '01024_Valiant_Sacrifice.png',
    '01025': '01025_Grim_Resolve.png',
    '01026': '01026_Steward_of_Gondor.png',
    '01027': "01027_Celebrían's_Stone.png",
    '01028': '01028_Veteran_Axehand.png',
    '01029': '01029_Gondorian_Spearman.png',
    '01030': '01030_Horseback_Archer.png',
    '01031': '01031_Beorn.png',
    '01032': '01032_Blade_Mastery.png',
    '01033': '01033_Rain_of_Arrows.png',
    '01034': '01034_Feint.png',
    '01035': '01035_Quick_Strike.png',
    '01036': '01036_Thicket_of_Spears.png',
    '01037': '01037_Swift_Strike.png',
    '01038': '01038_Stand_Together.png',
    '01039': '01039_Blade_of_Gondolin.png',
    '01040': '01040_Citadel_Plate.png',
    '01041': '01041_Dwarven_Axe.png',
    '01042': '01042_Horn_of_Gondor.png',
    '01043': '01043_Wandering_Took.png',
    '01044': '01044_Lórien_Guide.png',
    '01045': '01045_Northern_Tracker.png',
    '01046': "01046_The_Galadhrim's_Greeting.png",
    '01047': '01047_Strength_of_Will.png',
    '01048': '01048_Hasty_Stroke.png',
    '01049': '01049_Will_of_the_West.png',
    '01050': '01050_A_Test_of_Will.png',
    '01051': '01051_Stand_and_Fight.png',
    '01052': '01052_A_Light_in_the_Dark.png',
    '01053': '01053_Dwarven_Tomb.png',
    '01054': '01054_Fortune_or_Fate.png',
    '01055': '01055_The_Favor_of_the_Lady.png',
    '01056': '01056_Power_in_the_Earth.png',
    '01057': '01057_Unexpected_Courage.png',
    '01058': '01058_Daughter_of_the_Nimrodel.png',
    '01059': '01059_Erebor_Hammersmith.png',
    '01060': '01060_Henamarth_Riversong.png',
    '01061': '01061_Miner_of_the_Iron_Hills.png',
    '01062': '01062_Gléowine.png',
    '01063': '01063_Lore_of_Imladris.png',
    '01064': "01064_Lórien's_Wealth.png",
    '01065': "01065_Radagast's_Cunning.png",
    '01066': '01066_Secret_Paths.png',
    '01067': "01067_Gandalf's_Search.png",
    '01068': "01068_Beorn's_Hospitality.png",
    '01069': '01069_Forest_Snare.png',
    '01070': '01070_Protector_of_Lórien.png',
    '01071': '01071_Dark_Knowledge.png',
    '01072': '01072_Self_Preservation.png',
    '01073': '01073_Gandalf.png',
};

/**
 * Gets the path to a card image in the public/cards folder.
 * Uses a lookup table to match card codes to RingsDB filenames.
 */
function getCardImagePath(card: Card): string | null {
    const filename = CARD_IMAGE_FILENAMES[card.code];
    if (!filename) {
        return null;
    }
    return `/cards/${filename}`;
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
    const [zoomImgFailed, setZoomImgFailed] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const [zoomPosition, setZoomPosition] = useState<{ x: number; y: number } | null>(null);
    const cardRef = useRef<HTMLDivElement>(null);

    const showImage = !!card.imagesrc && !imgFailed;
    const zoomImagePath = getCardImagePath(card);
    const showZoomImage = !!zoomImagePath && !zoomImgFailed;

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

    const renderPlaceholder = (isZoomed = false, _showStatsInZoom = true) => {
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
        // First priority: Try to show RingsDB image from public/cards folder
        if (showZoomImage && zoomImagePath) {
            return (
                <img
                    className="card-display__zoom-image"
                    src={zoomImagePath}
                    alt={card.name}
                    onError={() => setZoomImgFailed(true)}
                />
            );
        }
        // Second priority: Show the card's own image if available
        if (showImage) {
            return (
                <img
                    className="card-display__image"
                    src={card.imagesrc}
                    alt={card.name}
                />
            );
        }
        // Fallback: Show placeholder
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
