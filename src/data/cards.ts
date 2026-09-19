export interface CardData {
  id: string;
  image: string;
}

export interface CardDefinition {
  type: 'attack' | 'defend' | 'attack and defend' | 'action' | 'scheme';
  value: number | null;
  name: string;
  discardValue: number;
  details: {
    title: string;
    subtitle: string | null;
  };
  amount: number;
  /** Slug matching the card's image filename under assets/cards/<character>/. */
  image: string;
}

export const klingons: CardDefinition[] = [
  {
    "type": "attack",
    "value": 6,
    "name": "BATTLECRUISER",
    "discardValue": 3,
    "details": {
      "title": "BAT'LETH OF KAHLESS",
      "subtitle": ""
    },
    "amount": 1,
    "image": "batleth-of-kahless"
  },
  {
    "type": "attack",
    "value": 4,
    "name": "BATTLECRUISER",
    "discardValue": 2,
    "details": {
      "title": "TACTICAL SACRIFICE",
      "subtitle": "AFTER COMBAT: Draw 2 cards."
    },
    "amount": 1,
    "image": "tactical-sacrifice"
  },
  {
    "type": "attack",
    "value": 4,
    "name": "BIRD-OF-PREY",
    "discardValue": 2,
    "details": {
      "title": "HONOR OF THE EMPIRE",
      "subtitle": "AFTER COMBAT: If you won the combat, draw 2 cards."
    },
    "amount": 1,
    "image": "honor-of-the-empire"
  },
  {
    "type": "attack",
    "value": 3,
    "name": "ANY",
    "discardValue": 2,
    "details": {
      "title": "DISRUPTOR BARRAGE",
      "subtitle": "AFTER COMBAT: Move your fighter up to 4 spaces."
    },
    "amount": 2,
    "image": "disruptor-barrage"
  },
  {
    "type": "attack",
    "value": 2,
    "name": "BATTLECRUISER",
    "discardValue": 3,
    "details": {
      "title": "GLORIOUS CHARGE",
      "subtitle": "DURING COMBAT: You may BOOST this attack. (This is in addition to any boost from Battlecruiser's special ability.)"
    },
    "amount": 3,
    "image": "glorious-charge"
  },
  {
    "type": "attack and defend",
    "value": 4,
    "name": "ANY",
    "discardValue": 1,
    "details": {
      "title": "FLANKING SALVO",
      "subtitle": "AFTER COMBAT: If you won the combat, choose one of the fighters in the combat and move them up to 2 spaces."
    },
    "amount": 3,
    "image": "flanking-salvo"
  },
  {
    "type": "attack and defend",
    "value": 3,
    "name": "ANY",
    "discardValue": 1,
    "details": {
      "title": "WARP ENGAGEMENT",
      "subtitle": "DURING COMBAT: If your fighter started this turn in a different space, this card's value is 5 instead."
    },
    "amount": 3,
    "image": "warp-engagement"
  },
  {
    "type": "attack and defend",
    "value": 3,
    "name": "BATTLECRUISER",
    "discardValue": 2,
    "details": {
      "title": "RAMMING SPEED",
      "subtitle": "AFTER COMBAT: Move Battlecruiser up to 5 spaces."
    },
    "amount": 2,
    "image": "ramming-speed"
  },
  {
    "type": "attack and defend",
    "value": 2,
    "name": "ANY",
    "discardValue": 1,
    "details": {
      "title": "SENSOR JAMMING",
      "subtitle": "IMMEDIATELY: Cancel all effects on your opponent's card."
    },
    "amount": 3,
    "image": "sensor-jamming"
  },
  {
    "type": "attack and defend",
    "value": 1,
    "name": "ANY",
    "discardValue": 1,
    "details": {
      "title": "REASSESS TACTICS",
      "subtitle": "AFTER COMBAT: Draw 1 card. If you won the combat, draw 2 cards instead."
    },
    "amount": 3,
    "image": "reassess-tactics"
  },
  {
    "type": "defend",
    "value": 1,
    "name": "BATTLECRUISER",
    "discardValue": 2,
    "details": {
      "title": "TODAY IS A GOOD DAY TO DIE",
      "subtitle": "AFTER COMBAT: If Battlecruiser has 4 or less health but is not defeated, set its health to 8."
    },
    "amount": 1,
    "image": "today-is-a-good-day-to-die"
  },
  {
    "type": "defend",
    "value": 0,
    "name": "BIRD-OF-PREY",
    "discardValue": 2,
    "details": {
      "title": "CLOAKED EVASION",
      "subtitle": "DURING COMBAT: Prevent all damage.\nAFTER COMBAT: You may place Bird-of-Prey in any space."
    },
    "amount": 2,
    "image": "cloaked-evasion"
  },
  {
    "type": "scheme",
    "value": 0,
    "name": "BATTLECRUISER",
    "discardValue": 2,
    "details": {
      "title": "FORGE THE WEAPON",
      "subtitle": "Search your deck and discard pile for the BAT'LETH OF KAHLESS card. Add it to your hand. If you searched your deck, shuffle it."
    },
    "amount": 1,
    "image": "forge-the-weapon"
  },
  {
    "type": "scheme",
    "value": 0,
    "name": "BIRD-OF-PREY",
    "discardValue": 2,
    "details": {
      "title": "CHANCELLOR'S VISION",
      "subtitle": "Look at the top 4 cards of your deck. Add 2 of them to your hand and put the other 2 back on top of your deck, in any order."
    },
    "amount": 1,
    "image": "chancellors-vision"
  },
  {
    "type": "scheme",
    "value": 0,
    "name": "BIRD-OF-PREY",
    "discardValue": 2,
    "details": {
      "title": "PLASMA STORM",
      "subtitle": "Move each fighter up to 3 spaces. (This includes opposing fighters.)"
    },
    "amount": 2,
    "image": "plasma-storm"
  },
  {
    "type": "scheme",
    "value": 0,
    "name": "BIRD-OF-PREY",
    "discardValue": 2,
    "details": {
      "title": "TARGETING SWEEP",
      "subtitle": "Choose any space in Bird-of-Prey's zone. Deal 2 damage to each opposing fighter in that space and in one adjacent space. If at least one fighter is defeated this way, draw 1 card."
    },
    "amount": 1,
    "image": "targeting-sweep"
  }
];

export const borg: CardDefinition[] = [
  {
    "type": "attack",
    "value": 3,
    "name": "BORG CUBE",
    "discardValue": 3,
    "details": {
      "title": "PRIMARY PHASER SALVO",
      "subtitle": "DURING COMBAT: You may BOOST this attack."
    },
    "amount": 3,
    "image": "primary-phaser-salvo"
  },
  {
    "type": "attack",
    "value": 2,
    "name": "BORG CUBE",
    "discardValue": 4,
    "details": {
      "title": "ASSIMILATION BEAM",
      "subtitle": "AFTER COMBAT: If you won the combat, deal 10 damage to the opposing fighter."
    },
    "amount": 3,
    "image": "assimilation-beam"
  },
  {
    "type": "attack",
    "value": 4,
    "name": "BORG SPHERE",
    "discardValue": 3,
    "details": {
      "title": "SPHERE RECTIFIER",
      "subtitle": "AFTER COMBAT: Move each Borg Sphere up to 3 spaces."
    },
    "amount": 2,
    "image": "sphere-rectifier"
  },
  {
    "type": "attack",
    "value": 3,
    "name": "ANY",
    "discardValue": 1,
    "details": {
      "title": "LONG-RANGE DISRUPTOR",
      "subtitle": "AFTER COMBAT: Draw 1 card."
    },
    "amount": 3,
    "image": "long-range-disruptor"
  },
  {
    "type": "attack",
    "value": 3,
    "name": "BORG SPHERE",
    "discardValue": 2,
    "details": {
      "title": "NANITE CLAW",
      "subtitle": "AFTER COMBAT: Your opponent discards 1 card."
    },
    "amount": 3,
    "image": "nanite-claw"
  },
  {
    "type": "attack and defend",
    "value": 3,
    "name": "ANY",
    "discardValue": 1,
    "details": {
      "title": "WARP ENGAGEMENT",
      "subtitle": "AFTER COMBAT: Move your fighter up to 3 spaces."
    },
    "amount": 3,
    "image": "warp-engagement"
  },
  {
    "type": "attack and defend",
    "value": 2,
    "name": "ANY",
    "discardValue": 2,
    "details": {
      "title": "ADAPTIVE SHIELDS",
      "subtitle": "IMMEDIATELY: Cancel all effects on your opponent's card."
    },
    "amount": 3,
    "image": "adaptive-shields"
  },
  {
    "type": "attack and defend",
    "value": 1,
    "name": "ANY",
    "discardValue": 2,
    "details": {
      "title": "REASSESS TACTICS",
      "subtitle": "AFTER COMBAT: Draw 1 card. If you won the combat, draw 2 cards instead."
    },
    "amount": 3,
    "image": "reassess-tactics"
  },
  {
    "type": "attack and defend",
    "value": 4,
    "name": "BORG CUBE",
    "discardValue": 3,
    "details": {
      "title": "SUB-SPACE INTERFERENCE",
      "subtitle": "AFTER COMBAT: Your opponent discards 1 card."
    },
    "amount": 3,
    "image": "sub-space-interference"
  },
  {
    "type": "scheme",
    "value": 0,
    "name": "BORG CUBE",
    "discardValue": 4,
    "details": {
      "title": "TACTICAL SCAN",
      "subtitle": "Deal 2 damage to any one fighter in Borg Cube's zone."
    },
    "amount": 2,
    "image": "tactical-scan"
  },
  {
    "type": "scheme",
    "value": 0,
    "name": "ANY",
    "discardValue": 2,
    "details": {
      "title": "COLLECTIVE SWARM",
      "subtitle": "Move each of your fighters up to 3 spaces. You may move them through spaces containing opposing fighters. Then, return a defeated Borg Sphere (if any) to any space in Borg Cube's zone."
    },
    "amount": 2,
    "image": "collective-swarm"
  }
];

export const federation: CardDefinition[] = [
  {
    "type": "attack",
    "value": 5,
    "name": "ANY",
    "discardValue": 2,
    "details": {
      "title": "TACTICAL OVERRIDE",
      "subtitle": "AFTER COMBAT: Draw 1 card."
    },
    "amount": 1,
    "image": "tactical-override"
  },
  {
    "type": "attack",
    "value": 3,
    "name": "SHUTTLE",
    "discardValue": 1,
    "details": {
      "title": "SUPPORT RUN",
      "subtitle": "AFTER COMBAT: Draw 2 cards."
    },
    "amount": 3,
    "image": "support-run"
  },
  {
    "type": "attack",
    "value": 2,
    "name": "ENTERPRISE",
    "discardValue": 1,
    "details": {
      "title": "MISSION LOG: NEBULA RECONNAISSANCE",
      "subtitle": "DURING COMBAT: This card's value is +1 for each other MISSION LOG card in your discard pile.\nAFTER COMBAT: You may move Enterprise up to 2 spaces."
    },
    "amount": 1,
    "image": "mission-log-nebula"
  },
  {
    "type": "attack",
    "value": 2,
    "name": "ENTERPRISE",
    "discardValue": 1,
    "details": {
      "title": "MISSION LOG: ANOMALY INVESTIGATION",
      "subtitle": "DURING COMBAT: This card's value is +1 for each other MISSION LOG card in your discard pile.\nAFTER COMBAT: Your opponent discards 1 random card."
    },
    "amount": 1,
    "image": "mission-log-anomaly"
  },
  {
    "type": "attack",
    "value": 2,
    "name": "ENTERPRISE",
    "discardValue": 1,
    "details": {
      "title": "MISSION LOG: DIPLOMATIC ESCORT",
      "subtitle": "DURING COMBAT: This card's value is +1 for each other MISSION LOG card in your discard pile.\nAFTER COMBAT: Draw 1 card."
    },
    "amount": 1,
    "image": "mission-log-diplomatic"
  },
  {
    "type": "attack",
    "value": 2,
    "name": "ENTERPRISE",
    "discardValue": 1,
    "details": {
      "title": "MISSION LOG: FIRST CONTACT",
      "subtitle": "DURING COMBAT: This card's value is +1 for each other MISSION LOG card in your discard pile.\nAFTER COMBAT: Look at your opponent's hand."
    },
    "amount": 1,
    "image": "mission-log-first-contact"
  },
  {
    "type": "attack",
    "value": 2,
    "name": "ENTERPRISE",
    "discardValue": 1,
    "details": {
      "title": "MISSION LOG: RETURN TO SPACE DOCK",
      "subtitle": "DURING COMBAT: This card's value is +1 for each other MISSION LOG card in your discard pile.\nAFTER COMBAT: Take all other MISSION LOG cards from your discard pile and add them to your hand."
    },
    "amount": 1,
    "image": "mission-log-return"
  },
  {
    "type": "attack",
    "value": 2,
    "name": "ENTERPRISE",
    "discardValue": 1,
    "details": {
      "title": "MISSION LOG: HOSTILE ENCOUNTER",
      "subtitle": "DURING COMBAT: This card's value is +1 for each other MISSION LOG card in your discard pile.\nAFTER COMBAT: Deal 2 damage to the opposing fighter."
    },
    "amount": 1,
    "image": "mission-log-hostile"
  },
  {
    "type": "attack",
    "value": 2,
    "name": "ENTERPRISE",
    "discardValue": 1,
    "details": {
      "title": "MISSION LOG: CHARTING UNKNOWN SPACE",
      "subtitle": "DURING COMBAT: This card's value is +1 for each other MISSION LOG card in your discard pile.\nAFTER COMBAT: Enterprise recovers 2 hull integrity."
    },
    "amount": 1,
    "image": "mission-log-charting"
  },
  {
    "type": "attack and defend",
    "value": 4,
    "name": "ANY",
    "discardValue": 1,
    "details": {
      "title": "TACTICAL INITIATIVE",
      "subtitle": "AFTER COMBAT: Draw 1 card."
    },
    "amount": 2,
    "image": "tactical-initiative"
  },
  {
    "type": "attack and defend",
    "value": 4,
    "name": "ANY",
    "discardValue": 1,
    "details": {
      "title": "EVASIVE MANEUVERS",
      "subtitle": "AFTER COMBAT: If you won the combat, choose one of the fighters in the combat and move them up to 4 spaces."
    },
    "amount": 2,
    "image": "evasive-maneuvers"
  },
  {
    "type": "attack and defend",
    "value": 3,
    "name": "ANY",
    "discardValue": 1,
    "details": {
      "title": "WARP ENGAGEMENT",
      "subtitle": "DURING COMBAT: If your ship started this turn in a different space, this card's value is 5 instead."
    },
    "amount": 3,
    "image": "warp-engagement"
  },
  {
    "type": "attack and defend",
    "value": 3,
    "name": "ENTERPRISE",
    "discardValue": 1,
    "details": {
      "title": "FULL IMPULSE",
      "subtitle": "AFTER COMBAT: Move Enterprise up to 3 spaces."
    },
    "amount": 4,
    "image": "full-impulse"
  },
  {
    "type": "attack and defend",
    "value": 2,
    "name": "ANY",
    "discardValue": 1,
    "details": {
      "title": "DEFLECTOR SHIELDS",
      "subtitle": "IMMEDIATELY: Cancel all effects on your opponent's card."
    },
    "amount": 3,
    "image": "deflector-shields"
  },
  {
    "type": "attack and defend",
    "value": 1,
    "name": "ANY",
    "discardValue": 1,
    "details": {
      "title": "REASSESS TACTICS",
      "subtitle": "AFTER COMBAT: Draw 1 card. If you won the combat, draw 2 cards instead."
    },
    "amount": 3,
    "image": "reassess-tactics"
  },
  {
    "type": "scheme",
    "value": 0,
    "name": "ENTERPRISE",
    "discardValue": 1,
    "details": {
      "title": "STARFLEET COMMAND DIRECTIVE",
      "subtitle": "Draw 3 cards."
    },
    "amount": 2,
    "image": "starfleet-directive"
  }
];

export const romulan: CardDefinition[] = [
  {
    "type": "attack",
    "value": 4,
    "name": "SCOUT SHIP",
    "discardValue": 2,
    "details": {
      "title": "PLASMA DISCHARGE",
      "subtitle": "AFTER COMBAT: Deal 2 damage to any one fighter adjacent to the Scout Ship."
    },
    "amount": 2,
    "image": "plasma-discharge"
  },
  {
    "type": "attack",
    "value": 4,
    "name": "WARBIRD",
    "discardValue": 4,
    "details": {
      "title": "TACTICAL SURPRISE",
      "subtitle": "AFTER COMBAT: Change cloak state."
    },
    "amount": 1,
    "image": "tactical-surprise"
  },
  {
    "type": "attack",
    "value": 3,
    "name": "WARBIRD",
    "discardValue": 4,
    "details": {
      "title": "WARBIRD MANEUVER",
      "subtitle": "AFTER COMBAT: Move Warbird up to 3 spaces. Change cloak state."
    },
    "amount": 1,
    "image": "warbird-maneuver"
  },
  {
    "type": "attack",
    "value": 3,
    "name": "SCOUT SHIP",
    "discardValue": 2,
    "details": {
      "title": "DISRUPTOR SWARM",
      "subtitle": "DURING COMBAT: If the opposing fighter is a flagship, this card's value is 5 instead."
    },
    "amount": 2,
    "image": "disruptor-swarm"
  },
  {
    "type": "attack",
    "value": 3,
    "name": "WARBIRD",
    "discardValue": 4,
    "details": {
      "title": "TAL SHIAR STRIKE",
      "subtitle": "AFTER COMBAT: If you won the combat, look at your opponent's hand and choose 1 card for them to discard."
    },
    "amount": 1,
    "image": "tal-shiar-strike"
  },
  {
    "type": "attack and defend",
    "value": 4,
    "name": "ANY",
    "discardValue": 1,
    "details": {
      "title": "FLANKING SALVO",
      "subtitle": "AFTER COMBAT: If you won the combat, choose one of the fighters in the combat and move them up to 2 spaces."
    },
    "amount": 2,
    "image": "flanking-salvo"
  },
  {
    "type": "attack and defend",
    "value": 3,
    "name": "WARBIRD",
    "discardValue": 1,
    "details": {
      "title": "SUBTERFUGE",
      "subtitle": "AFTER COMBAT: Move each of your ships up to 2 spaces. Change cloak state."
    },
    "amount": 2,
    "image": "subterfuge"
  },
  {
    "type": "attack and defend",
    "value": 3,
    "name": "ANY",
    "discardValue": 1,
    "details": {
      "title": "WARP ENGAGEMENT",
      "subtitle": "DURING COMBAT: If your ship started this turn in a different space, this card's value is 5 instead."
    },
    "amount": 2,
    "image": "warp-engagement"
  },
  {
    "type": "attack and defend",
    "value": 3,
    "name": "ANY",
    "discardValue": 2,
    "details": {
      "title": "OVERCHARGE CORE",
      "subtitle": "DURING COMBAT: Discard the top card of your deck. Add its BOOST value to this card's value."
    },
    "amount": 2,
    "image": "overcharge-core"
  },
  {
    "type": "attack and defend",
    "value": 2,
    "name": "ANY",
    "discardValue": 2,
    "details": {
      "title": "SENSOR JAMMING",
      "subtitle": "IMMEDIATELY: Cancel all effects on your opponent's card."
    },
    "amount": 3,
    "image": "sensor-jamming"
  },
  {
    "type": "attack and defend",
    "value": 2,
    "name": "WARBIRD",
    "discardValue": 3,
    "details": {
      "title": "CLOAKED SLIP",
      "subtitle": "AFTER COMBAT: Move Warbird up to 5 spaces. Change cloak state."
    },
    "amount": 3,
    "image": "cloaked-slip"
  },
  {
    "type": "attack and defend",
    "value": 1,
    "name": "ANY",
    "discardValue": 2,
    "details": {
      "title": "REASSESS TACTICS",
      "subtitle": "AFTER COMBAT: Draw 1 card. If you won the combat, draw 2 cards instead."
    },
    "amount": 3,
    "image": "reassess-tactics"
  },
  {
    "type": "attack and defend",
    "value": 2,
    "name": "WARBIRD",
    "discardValue": 4,
    "details": {
      "title": "SINGULARITY MATRIX",
      "subtitle": "AFTER COMBAT: Choose 2 different effects:\n- draw 2 cards\n- Warbird recovers 3 hull integrity\n- place Warbird in any other space"
    },
    "amount": 2,
    "image": "singularity-matrix"
  },
  {
    "type": "scheme",
    "value": 0,
    "name": "WARBIRD",
    "discardValue": 2,
    "details": {
      "title": "ENGAGE CLOAK",
      "subtitle": "Draw 2 cards. Change cloak state."
    },
    "amount": 2,
    "image": "engage-cloak"
  },
  {
    "type": "scheme",
    "value": 0,
    "name": "WARBIRD",
    "discardValue": 3,
    "details": {
      "title": "DECLOAK AND FIRE",
      "subtitle": "Move Warbird up to 3 spaces. Change cloak state."
    },
    "amount": 2,
    "image": "decloak-and-fire"
  }
];
