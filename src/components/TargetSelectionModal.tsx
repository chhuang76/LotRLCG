import type { EncounterCard, Hero, Ally, ActiveEnemy } from '../engine/types';
import CardDisplay from './CardDisplay';
import './TargetSelectionModal.css';

export type TargetType = 'enemy' | 'hero' | 'ally' | 'character' | 'any';

export interface TargetOption {
    id: string;
    name: string;
    type: 'hero' | 'ally' | 'enemy';
    card: Hero | Ally | EncounterCard;
    damage?: number;
    health?: number;
}

interface TargetSelectionModalProps {
    title: string;
    description: string;
    targetType: TargetType;
    targets: TargetOption[];
    onSelect: (targetId: string) => void;
    onCancel: () => void;
}

export function TargetSelectionModal({
    title,
    description,
    targetType,
    targets,
    onSelect,
    onCancel,
}: TargetSelectionModalProps) {
    const getTargetTypeLabel = (type: TargetType): string => {
        switch (type) {
            case 'enemy': return 'an enemy';
            case 'hero': return 'a hero';
            case 'ally': return 'an ally';
            case 'character': return 'a character';
            case 'any': return 'a target';
            default: return 'a target';
        }
    };

    const getTargetIcon = (type: 'hero' | 'ally' | 'enemy'): string => {
        switch (type) {
            case 'hero': return '👑';
            case 'ally': return '🤝';
            case 'enemy': return '⚔️';
            default: return '🎯';
        }
    };

    return (
        <div className="target-modal__overlay">
            <div className="target-modal">
                <div className="target-modal__header">
                    <h3 className="target-modal__title">{title}</h3>
                    <p className="target-modal__description">
                        {description || `Select ${getTargetTypeLabel(targetType)}`}
                    </p>
                </div>

                <div className="target-modal__targets">
                    {targets.length === 0 ? (
                        <div className="target-modal__no-targets">
                            No valid targets available
                        </div>
                    ) : (
                        targets.map((target) => (
                            <button
                                key={target.id}
                                className={`target-modal__target target-modal__target--${target.type}`}
                                onClick={() => onSelect(target.id)}
                            >
                                <div className="target-modal__target-icon">
                                    {getTargetIcon(target.type)}
                                </div>
                                <div className="target-modal__target-info">
                                    <span className="target-modal__target-name">
                                        {target.name}
                                    </span>
                                    {target.health !== undefined && (
                                        <span className="target-modal__target-health">
                                            HP: {(target.health ?? 0) - (target.damage ?? 0)}/{target.health}
                                        </span>
                                    )}
                                </div>
                                <div className="target-modal__target-card">
                                    <CardDisplay card={target.card as any} />
                                </div>
                            </button>
                        ))
                    )}
                </div>

                <div className="target-modal__footer">
                    <button className="target-modal__cancel" onClick={onCancel}>
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
}

// Helper to build target options from game state
export function buildEnemyTargets(engagedEnemies: ActiveEnemy[]): TargetOption[] {
    return engagedEnemies.map((ae, index) => ({
        id: `enemy-${index}`,
        name: ae.card.name,
        type: 'enemy' as const,
        card: ae.card,
        damage: ae.damage,
        health: ae.card.health,
    }));
}

export function buildHeroTargets(heroes: Hero[]): TargetOption[] {
    return heroes
        .filter((h) => h.damage < (h.health ?? 99)) // Only alive heroes
        .map((hero) => ({
            id: `hero-${hero.code}`,
            name: hero.name,
            type: 'hero' as const,
            card: hero,
            damage: hero.damage,
            health: hero.health,
        }));
}

export function buildAllyTargets(allies: Ally[]): TargetOption[] {
    return allies
        .filter((a) => (a.damage ?? 0) < (a.health ?? 99)) // Only alive allies
        .map((ally, index) => ({
            id: `ally-${index}`,
            name: ally.name,
            type: 'ally' as const,
            card: ally,
            damage: ally.damage,
            health: ally.health,
        }));
}

export function buildCharacterTargets(heroes: Hero[], allies: Ally[]): TargetOption[] {
    return [...buildHeroTargets(heroes), ...buildAllyTargets(allies)];
}

export default TargetSelectionModal;
