/**
 * Card ability registry barrel.
 *
 * Importing this module for its side-effects registers every per-card ability
 * module. Each card module self-registers via `registerAbility` (and friends)
 * from the engine when imported.
 *
 * Register new per-card modules here.
 */

import './01/01001-aragorn';
import './01/01004-gimli';
import './01/01005-legolas';
