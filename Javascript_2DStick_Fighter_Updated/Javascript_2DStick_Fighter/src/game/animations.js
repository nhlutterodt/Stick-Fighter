// Predefined animations for Stickman

import { AnimationClip, Track } from './AnimationPlayer.js';

// Idle animation: slight shoulder swing
export const idleClip = new AnimationClip(
  'idle',
  1000, // duration in ms
  [
    new Track('leftShoulderZ', [
      { time: 0, value: -0.2 },
      { time: 500, value: 0.2 },
      { time: 1000, value: -0.2 }
    ]),
    new Track('rightShoulderZ', [
      { time: 0, value: 0.2 },
      { time: 500, value: -0.2 },
      { time: 1000, value: 0.2 }
    ])
  ],
  true // loop
);

// Walking animation: swing limbs to mimic walk
export const walkClip = new AnimationClip(
  'walk',
  600, // duration
  [
    new Track('leftHipZ', [ { time: 0, value: -0.4 }, { time: 300, value: 0.4 }, { time: 600, value: -0.4 } ]),
    new Track('rightHipZ', [ { time: 0, value: 0.4 }, { time: 300, value: -0.4 }, { time: 600, value: 0.4 } ]),
    new Track('leftShoulderZ', [ { time: 0, value: 0.5 }, { time: 300, value: -0.5 }, { time: 600, value: 0.5 } ]),
    new Track('rightShoulderZ', [ { time: 0, value: -0.5 }, { time: 300, value: 0.5 }, { time: 600, value: -0.5 } ]),
    new Track('leftKneeZ', [ { time: 0, value: 0.2 }, { time: 300, value: -0.2 }, { time: 600, value: 0.2 } ]),
    new Track('rightKneeZ', [ { time: 0, value: -0.2 }, { time: 300, value: 0.2 }, { time: 600, value: -0.2 } ])
  ],
  true
);
