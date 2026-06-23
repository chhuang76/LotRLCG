/**
 * Card ability registry barrel.
 *
 * Importing this module for its side-effects registers every per-card ability
 * module. Each card module self-registers via `registerAbility` (and friends)
 * from the engine when imported.
 *
 * Register new per-card modules here.
 */

// Player cards
import './01/01001-aragorn';
import './01/01003-gloin';
import './01/01004-gimli';
import './01/01005-legolas';
import './01/01007-eowyn';
import './01/01012-beravor';
import './01/01026-steward-of-gondor';
import './01/01027-celebrians-stone';
import './01/01044-blade-of-gondolin';
import './01/01061-gandalf';

// Encounter cards - enemies
import './01/01074-king-spider';
import './01/01075-hummerhorns';
import './01/01076-ungoliants-spawn';
import './01/01096-forest-spider';
import './01/01098-chieftain-ufthak';

// Encounter cards - locations
import './01/01078-mountains-of-mirkwood';
import './01/01095-enchanted-stream';
import './01/01099-old-forest-road';
import './01/01100-forest-gate';

// Encounter cards - treacheries
import './01/01077-great-forest-web';
import './01/01080-caught-in-a-web';
import './01/01102-necromancers-reach';
import './01/01103-driven-by-shadow';
import './01/01104-despair';
