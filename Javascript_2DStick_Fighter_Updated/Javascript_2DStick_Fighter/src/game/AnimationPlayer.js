// Animation data structures and player for 2D Stick Fighter

/**
 * A keyframe within a track.
 * @typedef {Object} Keyframe
 * @property {number} time - Time (ms) within the clip.
 * @property {number} value - Value at this keyframe (e.g. rotation in radians).
 * @property {string} [easing] - Easing function name (e.g. 'linear').
 */

/**
 * A track animates a single property on a skeleton or character.
 */
export class Track {
  /**
   * @param {string} propertyPath - e.g. 'leftShoulderZ'
   * @param {Keyframe[]} keyframes
   */
  constructor(propertyPath, keyframes) {
    this.propertyPath = propertyPath;
    this.keyframes = keyframes;
  }
}

/**
 * An animation clip consisting of multiple tracks.
 */
export class AnimationClip {
  /**
   * @param {string} name
   * @param {number} duration - Duration in ms
   * @param {Track[]} tracks
   * @param {boolean} [loop=false]
   */
  constructor(name, duration, tracks, loop = false) {
    this.name = name;
    this.duration = duration;
    this.tracks = tracks;
    this.loop = loop;
  }
}

/**
 * Manages playback of animation clips.
 */
export class AnimationPlayer {
    constructor() {
      this.currentClip = null;
      this.time = 0;
      this.playing = false;
      this.onFinish = null;
      // blending state
      this.blendActive = false;
      this.blendElapsed = 0;
      this.blendDuration = 0;
      this.initialPose = {};
      this.latestPose = {};
    }

  /**
   * Play a clip.
   * @param {AnimationClip} clip
   * @param {{loop?: boolean, onFinish?: function, blend?: number}} [opts]
   */
  play(clip, opts = {}) {
     // initialize blending if requested
     if (opts.blend) {
       this.blendActive = true;
       this.blendElapsed = 0;
       this.blendDuration = opts.blend;
       this.initialPose = { ...this.latestPose };
     }
    this.currentClip = clip;
    this.time = 0;
    this.playing = true;
    this.currentClip.loop = opts.loop ?? clip.loop;
    this.onFinish = opts.onFinish || null;
  }

  /**
   * Stop playback.
   */
  stop() {
    this.playing = false;
  }

  /** Sample a clip at a given time to generate a pose map */
  samplePose(clip, time) {
    const pose = {};
    for (const track of clip.tracks) {
      const frames = track.keyframes;
      if (!frames.length) continue;
      let i = frames.findIndex(kf => kf.time >= time);
      if (i === -1) pose[track.propertyPath] = frames[frames.length - 1].value;
      else if (i === 0) pose[track.propertyPath] = frames[0].value;
      else {
        const a = frames[i-1], b = frames[i];
        const t0 = (time - a.time) / (b.time - a.time);
        pose[track.propertyPath] = a.value + (b.value - a.value) * t0;
      }
    }
    return pose;
  }

  /**
   * Update the player by advancing time and sampling.
   */
  update(delta) {
    if (!this.playing || !this.currentClip) return {};
    this.time += delta;
    if (this.time > this.currentClip.duration) {
      if (this.currentClip.loop) this.time %= this.currentClip.duration;
      else { this.time = this.currentClip.duration; this.playing = false; this.onFinish?.(); }
    }
    // Sample target clip pose
    const poseTo = {};
    for (const track of this.currentClip.tracks) {
      const frames = track.keyframes;
      if (!frames.length) continue;
      let i = frames.findIndex(kf => kf.time >= this.time);
      if (i === -1) poseTo[track.propertyPath] = frames[frames.length - 1].value;
      else if (i === 0) poseTo[track.propertyPath] = frames[0].value;
      else {
        const a = frames[i-1], b = frames[i];
        const t0 = (this.time - a.time) / (b.time - a.time);
        poseTo[track.propertyPath] = a.value + (b.value - a.value) * t0;
      }
    }
    // blend and return
    const outPose = this.blendPose(poseTo, delta);
    this.latestPose = outPose;
    return outPose;
  }

  /**
   * Blend between initialPose and new poseTo based on elapsed time.
   */
  blendPose(poseTo, delta) {
    if (!this.blendActive) return poseTo;
    this.blendElapsed += delta;
    const t = Math.min(this.blendElapsed / this.blendDuration, 1);
    const blended = {};
    for (const key in poseTo) {
      const fromVal = this.initialPose[key] !== undefined ? this.initialPose[key] : poseTo[key];
      blended[key] = fromVal * (1 - t) + poseTo[key] * t;
    }
    if (t === 1) this.blendActive = false;
    return blended;
  }
}
