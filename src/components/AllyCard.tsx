import type { PlayerCard } from '../engine/types';
import CardDisplay from './CardDisplay';
import './AllyCard.css';

export interface Ally extends PlayerCard {
    exhausted: boolean;
    damage: number;
}

interface AllyCardProps {
    ally: Ally;
    onExhaustToggle: () => void;
    onDamageChange: (delta: number) => void;
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
        <div className="ally-card__stat">
            <span className="ally-card__stat-icon">{STAT_ICONS[label]}</span>
            <span className="ally-card__stat-val">{value ?? '–'}</span>
        </div>
    );
}

// ── Damage bar ─────────────────────────────────────────────────────────────

function DamageBar({ current, max }: { current: number; max: number }) {
    const pct = max > 0 ? Math.min((current / max) * 100, 100) : 0;
    const severity = pct >= 75 ? 'critical' : pct >= 40 ? 'wounded' : '';

    return (
        <div className="ally-card__damage-track">
            <div className="ally-card__damage-label">
                <span>Damage</span>
                <span className="ally-card__damage-count">
                    {current}/{max}
                </span>
            </div>
            <div className="ally-card__damage-bar-bg">
                <div
                    className={`ally-card__damage-bar-fill ${severity}`}
                    style={{ width: `${pct}%` }}
                />
            </div>
        </div>
    );
}

// ── Main component ─────────────────────────────────────────────────────────

export function AllyCard({
    ally,
    onExhaustToggle,
    onDamageChange,
    highlighted = false,
}: AllyCardProps) {
    const maxHp = ally.health ?? 1;
    const sphereClass = ally.sphere_code ? `sphere-${ally.sphere_code}` : '';

    return (
        <div className={`ally-card ${sphereClass} ${ally.exhausted ? 'exhausted' : ''} ${highlighted ? 'highlighted' : ''}`}>
            {/* Portrait */}
            <div className="ally-card__portrait-wrap">
                <CardDisplay
                    card={ally}
                    exhausted={ally.exhausted}
                    damage={ally.damage}
                />
            </div>

            {/* Name + Sphere */}
            <div className="ally-card__label">
                <span className="ally-card__name">{ally.name}</span>
                {ally.sphere_code && (
                    <span className="ally-card__sphere">{ally.sphere_code}</span>
                )}
            </div>

            {/* Stats */}
            <div className="ally-card__stats">
                <StatCell label="WIL" value={ally.willpower} />
                <StatCell label="ATK" value={ally.attack} />
                <StatCell label="DEF" value={ally.defense} />
                <StatCell label="HP" value={ally.health} />
            </div>

            {/* Damage Track */}
            <DamageBar current={ally.damage} max={maxHp} />

            {/* Controls */}
            <div className="ally-card__controls">
                <button
                    className={`ally-card__exhaust-btn${ally.exhausted ? ' is-exhausted' : ''}`}
                    onClick={onExhaustToggle}
                >
                    {ally.exhausted ? '↺ Ready' : '↷ Exhaust'}
                </button>
                <div className="ally-card__damage-btns">
                    <button
                        className="ally-card__dmg-btn"
                        onClick={() => onDamageChange(-1)}
                        disabled={ally.damage <= 0}
                        title="Heal 1 damage"
                    >
                        −
                    </button>
                    <button
                        className="ally-card__dmg-btn"
                        onClick={() => onDamageChange(+1)}
                        title="Deal 1 damage"
                    >
                        +
                    </button>
                </div>
            </div>
        </div>
    );
}

export default AllyCard;
