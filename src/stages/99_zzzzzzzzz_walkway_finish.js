// Keep useful cover and body containers; move loose props out of junction centres.
// Authored positions are stable, so old checkpoints migrate through the same data.
// The smoking alcove and uniform-donor bay keep their intentional cover.
// Those crates shield authored interactions; the shared gate mouth stays clear.
const WALKWAY_FINISH={
 "m2": [
  {
   "tile": "C",
   "from": [
    30,
    2
   ],
   "to": [
    29,
    1
   ],
   "floor": ",",
   "targetFloor": ","
  },
  {
   "tile": "H",
   "from": [
    37,
    2
   ],
   "to": [
    37,
    1
   ],
   "floor": ",",
   "targetFloor": ","
  },
  {
   "tile": "H",
   "from": [
    20,
    10
   ],
   "to": [
    21,
    10
   ],
   "floor": ",",
   "targetFloor": ","
  },
  {
   "tile": "H",
   "from": [
    1,
    15
   ],
   "to": [
    1,
    8
   ],
   "floor": "=",
   "targetFloor": ","
  },
  {
   "tile": "H",
   "from": [
    37,
    15
   ],
   "to": [
    37,
    19
   ],
   "floor": ",",
   "targetFloor": "="
  },
  {
   "tile": "C",
   "from": [
    25,
    16
   ],
   "to": [
    22,
    19
   ],
   "floor": "=",
   "targetFloor": "="
  },
  {
   "tile": "C",
   "from": [
    28,
    16
   ],
   "to": [
    33,
    19
   ],
   "floor": "=",
   "targetFloor": "="
  },
  {
   "tile": "C",
   "from": [
    29,
    16
   ],
   "to": [
    34,
    19
   ],
   "floor": "=",
   "targetFloor": "="
  },
  {
   "tile": "H",
   "from": [
    43,
    16
   ],
   "to": [
    43,
    19
   ],
   "floor": ",",
   "targetFloor": "="
  }
 ],
 "m6": [
  {
   "tile": "H",
   "from": [
    21,
    2
   ],
   "to": [
    19,
    1
   ],
   "floor": ",",
   "targetFloor": ","
  },
  {
   "tile": "F",
   "from": [
    22,
    14
   ],
   "to": [
    23,
    16
   ],
   "floor": ",",
   "targetFloor": ","
  },
  {
   "tile": "H",
   "from": [
    38,
    15
   ],
   "to": [
    42,
    15
   ],
   "floor": ",",
   "targetFloor": ","
  },
  {
   "tile": "H",
   "from": [
    21,
    25
   ],
   "to": [
    14,
    25
   ],
   "floor": ",",
   "targetFloor": ","
  },
  {
   "tile": "H",
   "from": [
    36,
    25
   ],
   "to": [
    35,
    20
   ],
   "floor": ",",
   "targetFloor": ","
  }
 ],
 "m7": [
  {
   "tile": "H",
   "from": [
    7,
    11
   ],
   "to": [
    9,
    10
   ],
   "floor": ",",
   "targetFloor": ","
  },
  {
   "tile": "H",
   "from": [
    13,
    22
   ],
   "to": [
    17,
    21
   ],
   "floor": ".",
   "targetFloor": "="
  }
 ],
 "n1": [
  {
   "tile": "F",
   "from": [
    36,
    27
   ],
   "to": [
    33,
    29
   ],
   "floor": ".",
   "targetFloor": "="
  }
 ]
};
for(const[id,moves]of Object.entries(WALKWAY_FINISH)){
 const s=campaignStage(id);s.walkwayFinish=moves;s.fixtureMoves=(s.fixtureMoves||[]).concat(moves);
}
// Storage still uses the owned cabinet modules, with a clear service aisle.
campaignStage('m2').roomPatches=(campaignStage('m2').roomPatches||[]).concat({fl:0,bounds:[14,26,22,32],furniture:[{t:'shelf',from:[15,29],to:[15,29],w:2}],tiles:[[17,29,'t']]});
campaignStage('m6').roomPatches=(campaignStage('m6').roomPatches||[]).concat({fl:0,bounds:[24,16,32,24],furniture:[{t:'shelf',from:[26,19],to:[25,19]},{t:'shelf',from:[26,21],to:[25,21]}],tiles:[[28,19,'t'],[28,21,'t']]});
// Seat the chair at its table, rather than in the shared centre aisle.
campaignStage('m4').roomPatches=(campaignStage('m4').roomPatches||[]).concat({fl:0,bounds:[22,17,32,24],furniture:[{t:'chair',from:[26,20],to:[25,19],r:0}],tiles:[[26,20,'t']]});

// Keep door turning space and the dispatch corridor clear. Containers retain
// their hiding function and migrate together with saved occupants and bodies.
const DOOR_CLEARANCE={
 tB:[{tile:'H',from:[22,11],to:[25,6],floor:'h',targetFloor:','}],
 m4:[{tile:'H',from:[9,1],to:[5,1],floor:'.',targetFloor:'.'},
     {tile:'H',from:[2,7],to:[2,3],floor:'r',targetFloor:'r'},
     {tile:'H',from:[19,19],to:[14,23],floor:',',targetFloor:','}],
 m7:[{tile:'H',from:[24,13],to:[11,16],floor:'h',targetFloor:'h'}],
 n1:[{tile:'H',from:[9,23],to:[9,24],floor:',',targetFloor:','}]
};
for(const[id,moves]of Object.entries(DOOR_CLEARANCE)){
 const s=campaignStage(id);s.doorClearance=moves;s.fixtureMoves=(s.fixtureMoves||[]).concat(moves);
}
