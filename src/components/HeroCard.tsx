import { useState } from 'react';
import type { PlayerCard, Hero, AttachedCard } from '../engine/types';
import CardDisplay from './CardDisplay';
import { useGameStore } from '../store/gameStore';
import './HeroCard.css';

interface HeroCardProps {
    card: Hero;
    resources: number;
    damage: number;
    exhausted: boolean;
    onExhaustToggle: () => void;
    onResourceChange: (delta: number) => void;
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

// ── Resource pips ──────────────────────────────────────────────────────────

function ResourcePips({ current, max }: { current: number; max: number }) {
    const total = Math.max(current, max, 0);
    return (
        <div className="hero-card__resource-pips">
            {Array.from({ length: total }).map((_, i) => (
                <span
                    key={i}
                    className={`hero-card__resource-pip${i < current ? ' filled' : ''}`}
                />
            ))}
        </div>
    );
}

// ── Damage bar ─────────────────────────────────────────────────────────────

function DamageBar({ current, max }: { current: number; max: number }) {
    const pct = max > 0 ? Math.min((current / max) * 100, 100) : 0;
    const severity = pct >= 75 ? 'critical' : pct >= 40 ? 'wounded' : '';

    return (
        <div className="hero-card__damage-track">
            <div className="hero-card__damage-label">
                <span>Damage</span>
                <span className="hero-card__damage-count">
                    {current}/{max}
                </span>
            </div>
            <div className="hero-card__damage-bar-bg">
                <div
                    className={`hero-card__damage-bar-fill ${severity}`}
                    style={{ width: `${pct}%` }}
                />
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
    onResourceChange,
    highlighted = false,
    onClick,
    playerId = 'player1',
}: HeroCardProps) {
    const [showAbilities, setShowAbilities] = useState(false);
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

    return (
        <div
            className={`hero-card ${sphereClass} ${exhausted ? 'exhausted' : ''} ${highlighted ? 'highlighted' : ''}`}
            onClick={handleCardClick}
        >
            {/* Portrait */}
            <div className="hero-card__portrait-wrap">
                <CardDisplay
                    card={card}
                    exhausted={exhausted}
                    damage={damage}
                    hideStats={true}
                />
            </div>

            {/* Name + Sphere */}
            <div className="hero-card__label">
                <span className="hero-card__name">{card.name}</span>
                {card.sphere_code && (
                    <span className="hero-card__sphere">{card.sphere_code}</span>
                )}
            </div>

            {/* Stats (with attachment bonuses) */}
            <div className="hero-card__stats">
                <StatCell label="WIL" baseValue={card.willpower} bonus={bonuses.willpower} />
                <StatCell label="ATK" baseValue={card.attack} bonus={bonuses.attack} />
                <StatCell label="DEF" baseValue={card.defense} bonus={bonuses.defense} />
                <StatCell label="HP" baseValue={card.health} bonus={bonuses.health} />
            </div>

            {/* Resources */}
            <div className="hero-card__resources">
                <span className="hero-card__resources-label">Res</span>
                <ResourcePips current={resources} max={Math.max(resources, 5)} />
                <div className="hero-card__resource-btns">
                    <button
                        className="hero-card__res-btn"
                        onClick={() => onResourceChange(-1)}
                        disabled={resources <= 0}
                        title="Spend resource"
                    >
                        −
                    </button>
                    <button
                        className="hero-card__res-btn"
                        onClick={() => onResourceChange(+1)}
                        title="Gain resource"
                    >
                        +
                    </button>
                </div>
            </div>

            {/* Damage Track */}
            <DamageBar current={damage} max={maxHp} />

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
