import type { PlayerCard } from '../engine/types';
import CardDisplay from './CardDisplay';
import './MulliganModal.css';

interface MulliganModalProps {
    hand: PlayerCard[];
    onKeepHand: () => void;
    onMulligan: () => void;
}

export function MulliganModal({ hand, onKeepHand, onMulligan }: MulliganModalProps) {
    return (
        <div className="mulligan-modal__backdrop">
            <div className="mulligan-modal">
                <div className="mulligan-modal__header">
                    <h2 className="mulligan-modal__title">Starting Hand</h2>
                    <p className="mulligan-modal__subtitle">
                        You may shuffle your hand back into your deck and draw a new hand of 6 cards.
                        <br />
                        <span className="mulligan-modal__warning">This can only be done once!</span>
                    </p>
                </div>

                <div className="mulligan-modal__hand">
                    {hand.map((card, index) => (
                        <div key={`${card.code}-${index}`} className="mulligan-modal__card">
                            <CardDisplay card={card} disableZoom />
                        </div>
                    ))}
                </div>

                <div className="mulligan-modal__actions">
                    <button
                        className="mulligan-modal__button mulligan-modal__button--keep"
                        onClick={onKeepHand}
                    >
                        ✓ Keep Hand
                    </button>
                    <button
                        className="mulligan-modal__button mulligan-modal__button--mulligan"
                        onClick={onMulligan}
                    >
                        ↻ Take Mulligan
                    </button>
                </div>
            </div>
        </div>
    );
}

export default MulliganModal;
