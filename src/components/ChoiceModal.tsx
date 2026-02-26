import './ChoiceModal.css';

interface ChoiceModalProps {
    title: string;
    description?: string;
    choices: string[];
    onSelect: (choiceIndex: number) => void;
    onCancel?: () => void;
}

export function ChoiceModal({
    title,
    description,
    choices,
    onSelect,
    onCancel,
}: ChoiceModalProps) {
    return (
        <div className="choice-modal__overlay">
            <div className="choice-modal">
                <div className="choice-modal__header">
                    <h3 className="choice-modal__title">{title}</h3>
                    {description && (
                        <p className="choice-modal__description">{description}</p>
                    )}
                </div>
                <div className="choice-modal__options">
                    {choices.map((choice, index) => (
                        <button
                            key={index}
                            className="choice-modal__option"
                            onClick={() => onSelect(index)}
                        >
                            <span className="choice-modal__option-number">{index + 1}</span>
                            <span className="choice-modal__option-text">{choice}</span>
                        </button>
                    ))}
                </div>
                {onCancel && (
                    <button className="choice-modal__cancel" onClick={onCancel}>
                        Cancel
                    </button>
                )}
            </div>
        </div>
    );
}

export default ChoiceModal;
