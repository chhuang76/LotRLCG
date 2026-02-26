import { useEffect } from 'react';
import GameTable from './components/GameTable';
import type { PlayerCard } from './engine/types';
import { useGameStore } from './store/gameStore';

// ── Starting heroes ────────────────────────────────────────────────────────

const HEROES: PlayerCard[] = [
  {
    code: '01001', name: 'Aragorn', type_code: 'hero', sphere_code: 'leadership',
    threat: 12, willpower: 2, attack: 3, defense: 2, health: 5,
    traits: 'Dúnedain. Noble. Ranger.',
    text: '<b>Action:</b> Spend 1 resource from Aragorn\'s pool to ready him. (Limit once per phase.)',
    quantity: 1,
  },
  {
    code: '01005', name: 'Legolas', type_code: 'hero', sphere_code: 'tactics',
    threat: 9, willpower: 1, attack: 3, defense: 1, health: 4,
    traits: 'Silvan. Noble.',
    text: '<b>Response:</b> After Legolas participates in an attack that destroys an enemy, place 2 progress tokens on the current quest.',
    quantity: 1,
  },
  {
    code: '01004', name: 'Gimli', type_code: 'hero', sphere_code: 'tactics',
    threat: 11, willpower: 2, attack: 2, defense: 2, health: 5,
    traits: 'Dwarf. Warrior.',
    text: '<b>Forced:</b> After Gimli takes damage, he gets +1 [attack] for each damage token on him until the end of the round.',
    quantity: 1,
  },
];

// ── Starting player deck ───────────────────────────────────────────────────

const PLAYER_DECK: PlayerCard[] = [
  {
    code: '01026', name: 'Steward of Gondor', type_code: 'attachment', sphere_code: 'leadership',
    cost: 2, traits: 'Gondor. Title.',
    text: 'Attach to a hero.<br/><b>Action:</b> Exhaust Steward of Gondor to add 2 resources to attached hero\'s pool.',
    quantity: 3,
  },
  {
    code: '01027', name: 'Celebrían\'s Stone', type_code: 'attachment', sphere_code: 'leadership',
    cost: 2, traits: 'Artifact. Item.',
    text: 'Attach to a hero. Attached hero gains the Spirit trait and gets +2 [willpower].',
    quantity: 1,
  },
  {
    code: '01023', name: 'Sneak Attack', type_code: 'event', sphere_code: 'leadership',
    cost: 1, traits: '',
    text: '<b>Action:</b> Put an ally card from your hand into play. At the end of the phase, if that ally is still in play, return it to your hand.',
    quantity: 3,
  },
  {
    code: '01037', name: 'Swift Strike', type_code: 'event', sphere_code: 'tactics',
    cost: 2, traits: '',
    text: '<b>Response:</b> After a character is declared as a defender, deal 2 damage to the attacking enemy.',
    quantity: 3,
  },
  {
    code: '01039', name: 'Blade of Gondolin', type_code: 'attachment', sphere_code: 'tactics',
    cost: 1, traits: 'Item. Weapon.',
    text: 'Attach to a hero. Restricted.<br/>Attached hero gets +1 [attack].<br/><b>Response:</b> After attached hero attacks and destroys an enemy, place 1 progress token on the current quest.',
    quantity: 3,
  },
  {
    code: '01073', name: 'Gandalf', type_code: 'ally', sphere_code: 'neutral',
    cost: 5, willpower: 4, attack: 4, defense: 4, health: 4,
    traits: 'Istari.',
    text: 'At the end of the round, discard Gandalf from play.<br/><b>Response:</b> After Gandalf enters play, (choose 1): draw 3 cards, deal 4 damage to 1 enemy in play, or reduce your threat by 5.',
    quantity: 3,
  },
];

// ── App ────────────────────────────────────────────────────────────────────

export default function App() {
  const initGame = useGameStore((s) => s.initGame);
  const gameState = useGameStore((s) => s.gameState);

  useEffect(() => {
    initGame(HEROES, PLAYER_DECK);
  }, [initGame]);

  if (!gameState.players?.length) {
    return (
      <div style={{ background: '#0b0d0f', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f5d76e', fontFamily: 'Palatino Linotype, serif', fontSize: 24 }}>
        Loading Passage Through Mirkwood…
      </div>
    );
  }

  return <GameTable />;
}
