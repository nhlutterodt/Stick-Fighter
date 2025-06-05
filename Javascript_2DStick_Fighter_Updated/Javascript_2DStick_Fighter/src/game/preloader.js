// preloader.js - Asset preloader for Stick Fighter
// Usage: import { preloadAssets } from './preloader.js';
//        preloadAssets(onProgress).then(assets => { ... });

const assetManifest = [
  { key: 'stickmanSprite', type: 'image', path: './assets/sprites/stickman.png' },
  { key: 'background',    type: 'image', path: './assets/backgrounds/arena.png' },
  { key: 'hitSound',      type: 'audio', path: './assets/sfx/hit.wav' },
  // Add more assets as needed
];

export function preloadAssets(onProgress) {
  const promises = assetManifest.map(asset => {
    return new Promise((resolve, reject) => {
      if (asset.type === 'image') {
        const img = new window.Image();
        img.src = asset.path;
        img.onload = () => resolve({ key: asset.key, data: img });
        img.onerror = reject;
      } else if (asset.type === 'audio') {
        const audio = new window.Audio();
        audio.src = asset.path;
        audio.oncanplaythrough = () => resolve({ key: asset.key, data: audio });
        audio.onerror = reject;
      } else {
        // JSON or other types
        fetch(asset.path)
          .then(res => res.json())
          .then(json => resolve({ key: asset.key, data: json }))
          .catch(reject);
      }
    }).then(result => {
      if (onProgress) onProgress(assetManifest.indexOf(asset) + 1, assetManifest.length);
      return result;
    });
  });
  return Promise.all(promises);
}
