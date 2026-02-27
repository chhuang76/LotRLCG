import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { PlayerCard, Hero, AttachedCard } from '../engine/types';
import CardDisplay from './CardDisplay';
import { useGameStore } from '../store/gameStore';
import './HeroCard.css';

// ── Portrait image lookup ─────────────────────────────────────────────────

const PORTRAIT_FILENAMES: Record<string, string> = {
    '01001': '01001_Aragorn_CardPortrait.png',
    '01002': '01002_Théodred_CardPortrait.png',
    '01003': '01003_Glóin_CardPortrait.png',
    '01004': '01004_Gimli_CardPortrait.png',
    '01005': '01005_Legolas_CardPortrait.png',
    '01006': '01006_Thalin_CardPortrait.png',
    '01007': '01007_Éowyn_CardPortrait.png',
    '01008': '01008_Eleanor_CardPortrait.png',
    '01009': '01009_Dúnhere_CardPortrait.png',
    '01010': '01010_Denethor_CardPortrait.png',
    '01011': '01011_Glorfindel_CardPortrait.png',
    '01012': '01012_Beravor_CardPortrait.png',
};

// Full card image lookup (for zoom view)
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
};

function getPortraitImagePath(code: string): string | null {
    const filename = PORTRAIT_FILENAMES[code];
    if (!filename) return null;
    return `/cardPortraits/${filename}`;
}

function getCardImagePath(code: string): string | null {
    const filename = CARD_IMAGE_FILENAMES[code];
    if (!filename) return null;
    return `/cards/${filename}`;
}

interface HeroCardProps {
    card: Hero;
    resources: number;
    damage: number;
    exhausted: boolean;
    onExhaustToggle: () => void;
    highlighted?: boolean;
    onClick?: () => void;
    playerId?: string;
}

// ── Stat helper ────────────────────────────────────────────────────────────

const STAT_ICONS: Record<string, string> = {
    WIL: '🌟',
    ATK: '⚔',
    DEF: '🛡',
    HP: '❤',
};

function StatCell({ label, baseValue, bonus }: { label: string; baseValue?: number; bonus?: number }) {
    // Convert to boolean to prevent JSX rendering "0" when bonus is 0
    const hasBonus = Boolean(bonus && bonus > 0);
    const total = Number(baseValue ?? 0) + Number(bonus ?? 0);

    return (
        <div className={`hero-card__stat ${hasBonus ? 'has-bonus' : ''}`}>
            <span className="hero-card__stat-icon">{STAT_ICONS[label]}</span>
            <span className="hero-card__stat-val">
                {total}
                {hasBonus && <span className="hero-card__stat-bonus">+{bonus}</span>}
            </span>
        </div>
    );
}

// ── Calculate attachment bonuses ──────────────────────────────────────────

interface AttachmentBonuses {
    willpower: number;
    attack: number;
    defense: number;
    health: number;
}

function calculateAttachmentBonuses(attachments: PlayerCard[]): AttachmentBonuses {
    const bonuses: AttachmentBonuses = { willpower: 0, attack: 0, defense: 0, health: 0 };

    for (const att of attachments) {
        const text = att.text ?? '';

        // Parse willpower bonuses
        if (text.includes('+1 [willpower]') || text.includes('+1 Willpower')) bonuses.willpower += 1;
        if (text.includes('+2 [willpower]') || text.includes('+2 Willpower')) bonuses.willpower += 2;
        if (text.includes('+3 [willpower]') || text.includes('+3 Willpower')) bonuses.willpower += 3;

        // Parse attack bonuses
        if (text.includes('+1 [attack]') || text.includes('+1 Attack')) bonuses.attack += 1;
        if (text.includes('+2 [attack]') || text.includes('+2 Attack')) bonuses.attack += 2;
        if (text.includes('+3 [attack]') || text.includes('+3 Attack')) bonuses.attack += 3;

        // Parse defense bonuses
        if (text.includes('+1 [defense]') || text.includes('+1 Defense')) bonuses.defense += 1;
        if (text.includes('+2 [defense]') || text.includes('+2 Defense')) bonuses.defense += 2;
        if (text.includes('+3 [defense]') || text.includes('+3 Defense')) bonuses.defense += 3;

        // Parse health bonuses
        if (text.includes('+1 [health]') || text.includes('+1 Health') || text.includes('+1 hit point')) bonuses.health += 1;
        if (text.includes('+2 [health]') || text.includes('+2 Health') || text.includes('+2 hit points')) bonuses.health += 2;
        if (text.includes('+3 [health]') || text.includes('+3 Health') || text.includes('+3 hit points')) bonuses.health += 3;
    }

    return bonuses;
}

// ── Resource & Damage combined row ────────────────────────────────────────

function ResourceDamageRow({
    resources,
    damage,
    maxHp,
}: {
    resources: number;
    damage: number;
    maxHp: number;
}) {
    const pct = maxHp > 0 ? Math.min((damage / maxHp) * 100, 100) : 0;
    const severity = pct >= 75 ? 'critical' : pct >= 40 ? 'wounded' : '';

    return (
        <div className="hero-card__resource-damage-row">
            <div
                className="hero-card__resource-section"
                title={`Resources: ${resources}`}
            >
                <span className="hero-card__resource-icon">💰</span>
                <span className="hero-card__resource-value">{resources}</span>
            </div>
            <div
                className={`hero-card__damage-section ${severity}`}
                title={`Damage: ${damage} / ${maxHp} HP`}
            >
                <span className="hero-card__damage-icon">💔</span>
                <span className="hero-card__damage-value">{damage}/{maxHp}</span>
            </div>
        </div>
    );
}

// ── Attachment display ────────────────────────────────────────────────────

interface AttachmentBadgeProps {
    attachment: AttachedCard;
    onClick: () => void;
}

function AttachmentBadge({ attachment, onClick }: AttachmentBadgeProps) {
    // Calculate stat bonuses from attachment text (simplified parsing)
    const bonuses: string[] = [];
    const text = attachment.text ?? '';

    if (text.includes('+1 [willpower]') || text.includes('+1 Willpower')) bonuses.push('+1 WIL');
    if (text.includes('+2 [willpower]') || text.includes('+2 Willpower')) bonuses.push('+2 WIL');
    if (text.includes('+1 [attack]') || text.includes('+1 Attack')) bonuses.push('+1 ATK');
    if (text.includes('+2 [attack]') || text.includes('+2 Attack')) bonuses.push('+2 ATK');
    if (text.includes('+1 [defense]') || text.includes('+1 Defense')) bonuses.push('+1 DEF');
    if (text.includes('+2 [defense]') || text.includes('+2 Defense')) bonuses.push('+2 DEF');

    const sphereClass = attachment.sphere_code ? `sphere-${attachment.sphere_code}` : '';
    const exhaustedClass = attachment.exhausted ? 'is-exhausted' : '';

    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent triggering hero card click
        onClick();
    };

    return (
        <button
            className={`hero-card__attachment ${sphereClass} ${exhaustedClass}`}
            title={`Click to ${attachment.exhausted ? 'ready' : 'exhaust'} ${attachment.name}`}
            onClick={handleClick}
        >
            <span className="hero-card__attachment-name">
                {attachment.exhausted && '💤 '}
                {attachment.name}
            </span>
            {bonuses.length > 0 && (
                <span className="hero-card__attachment-bonuses">
                    {bonuses.join(' ')}
                </span>
            )}
            <span className="hero-card__attachment-toggle">
                {attachment.exhausted ? '↺' : '↷'}
            </span>
        </button>
    );
}

// ── Abilities dropdown ─────────────────────────────────────────────────────

interface AbilityInfo {
    id: string;
    name: string;
    description: string;
    canActivate: boolean;
    reason?: string;
}

function AbilitiesDropdown({
    abilities,
    onActivate,
    onClose,
}: {
    abilities: AbilityInfo[];
    onActivate: (abilityId: string) => void;
    onClose: () => void;
}) {
    return (
        <div className="hero-card__abilities-dropdown">
            <div className="hero-card__abilities-header">
                <span>Abilities</span>
                <button className="hero-card__abilities-close" onClick={onClose}>×</button>
            </div>
            {abilities.length === 0 ? (
                <div className="hero-card__ability-item disabled">No abilities available</div>
            ) : (
                abilities.map((ability) => (
                    <button
                        key={ability.id}
                        className={`hero-card__ability-item ${ability.canActivate ? 'available' : 'disabled'}`}
                        onClick={() => ability.canActivate && onActivate(ability.id)}
                        disabled={!ability.canActivate}
                        title={ability.reason ?? ability.description}
                    >
                        <span className="hero-card__ability-name">{ability.description}</span>
                        {!ability.canActivate && ability.reason && (
                            <span className="hero-card__ability-reason">({ability.reason})</span>
                        )}
                    </button>
                ))
            )}
        </div>
    );
}

// ── Main component ─────────────────────────────────────────────────────────

export function HeroCard({
    card,
    resources,
    damage,
    exhausted,
    onExhaustToggle,
    highlighted = false,
    onClick,
    playerId = 'player1',
}: HeroCardProps) {
    const [showAbilities, setShowAbilities] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const [zoomPosition, setZoomPosition] = useState<{ x: number; y: number } | null>(null);
    const portraitRef = useRef<HTMLDivElement>(null);

    const getAvailableAbilities = useGameStore((state) => state.getAvailableAbilities);
    const activateCardAbility = useGameStore((state) => state.activateCardAbility);
    const toggleAttachmentExhaust = useGameStore((state) => state.toggleAttachmentExhaust);

    const bonuses = calculateAttachmentBonuses(card.attachments ?? []);
    const maxHp = (card.health ?? 1) + bonuses.health;
    const sphereClass = card.sphere_code ? `sphere-${card.sphere_code}` : '';

    // Get available abilities for this hero
    const abilities = getAvailableAbilities(playerId, card.code);
    const hasAbilities = abilities.length > 0;
    const hasActivatableAbility = abilities.some((a) => a.canActivate);

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

    // Handle click on the card itself (for attachment targeting)
    const handleCardClick = () => {
        if (highlighted && onClick) {
            onClick();
        }
    };

    const handleAbilityActivate = (abilityId: string) => {
        activateCardAbility(playerId, abilityId, card.code);
        setShowAbilities(false);
    };

    const portraitImagePath = getPortraitImagePath(card.code);
    const cardImagePath = getCardImagePath(card.code);

    return (
        <div
            className={`hero-card ${sphereClass} ${exhausted ? 'exhausted' : ''} ${highlighted ? 'highlighted' : ''}`}
            onClick={handleCardClick}
        >
            {/* Portrait - 1:1 square aspect ratio */}
            <div
                className="hero-card__portrait-wrap"
                ref={portraitRef}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
            >
                {portraitImagePath ? (
                    <img
                        className="hero-card__portrait-image"
                        src={portraitImagePath}
                        alt={card.name}
                    />
                ) : (
                    <CardDisplay
                        card={card}
                        exhausted={exhausted}
                        damage={damage}
                        hideStats={true}
                    />
                )}
                {/* Name overlay at top of portrait */}
                <div className="hero-card__name-overlay">
                    <span className="hero-card__name">{card.name}</span>
                    <span className="hero-card__sphere-text">{card.sphere_code}</span>
                </div>
                {/* Stats overlay at bottom of portrait */}
                <div className="hero-card__stats-overlay">
                    <StatCell label="WIL" baseValue={card.willpower} bonus={bonuses.willpower} />
                    <StatCell label="ATK" baseValue={card.attack} bonus={bonuses.attack} />
                    <StatCell label="DEF" baseValue={card.defense} bonus={bonuses.defense} />
                    <StatCell label="HP" baseValue={card.health} bonus={bonuses.health} />
                </div>
            </div>

            {/* Zoomed card overlay */}
            {isHovered && zoomPosition && cardImagePath && createPortal(
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
                            alt={card.name}
                        />
                    </div>
                </div>,
                document.body
            )}

            {/* Resources & Damage combined row */}
            <ResourceDamageRow
                resources={resources}
                damage={damage}
                maxHp={maxHp}
            />

            {/* Controls: Exhaust + Abilities */}
            <div className="hero-card__controls">
                <button
                    className={`hero-card__exhaust-btn${exhausted ? ' is-exhausted' : ''}`}
                    onClick={onExhaustToggle}
                >
                    {exhausted ? '↺ Ready' : '↷ Exhaust'}
                </button>
                {hasAbilities && (
                    <button
                        className={`hero-card__ability-btn ${hasActivatableAbility ? 'has-activatable' : ''}`}
                        onClick={() => setShowAbilities(!showAbilities)}
                        title="View abilities"
                    >
                        ⚡ Ability
                    </button>
                )}
            </div>

            {/* Abilities dropdown */}
            {showAbilities && (
                <AbilitiesDropdown
                    abilities={abilities}
                    onActivate={handleAbilityActivate}
                    onClose={() => setShowAbilities(false)}
                />
            )}

            {/* Attachments */}
            {card.attachments && card.attachments.length > 0 && (
                <div className="hero-card__attachments">
                    {card.attachments.map((att, i) => (
                        <AttachmentBadge
                            key={`${att.code}-${i}`}
                            attachment={att}
                            onClick={() => toggleAttachmentExhaust(playerId, card.code, i)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

export default HeroCard;
