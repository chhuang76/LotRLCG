import type { EncounterCard } from '../engine/types';
import CardDisplay from './CardDisplay';
import './StagingArea.css';

interface StagingAreaProps {
    cards: EncounterCard[];
    onCardClick?: (card: EncounterCard, index: number) => void;
    isTravelPhase?: boolean;
    hasActiveLocation?: boolean;
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
                                <CardDisplay card={card} />
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
