import type { ActiveEnemy } from '../engine/types';
import CardDisplay from './CardDisplay';
import './EngagedEnemyCard.css';

interface EngagedEnemyCardProps {
    enemy: ActiveEnemy;
}

/**
 * Displays an engaged enemy with its shadow cards.
 * Shadow cards are shown face-down until revealed during combat.
 */
export function EngagedEnemyCard({ enemy }: EngagedEnemyCardProps) {
    const hasShadowCards = enemy.shadowCards.length > 0;

    return (
        <div className="engaged-enemy">
            {/* Main enemy card */}
            <div className="engaged-enemy__card">
                <CardDisplay card={enemy.card} damage={enemy.damage} />
            </div>

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

            {/* Damage overlay */}
            {enemy.damage > 0 && (
                <div className="engaged-enemy__damage-badge">
                    {enemy.damage} dmg
                </div>
            )}
        </div>
    );
}

export default EngagedEnemyCard;
