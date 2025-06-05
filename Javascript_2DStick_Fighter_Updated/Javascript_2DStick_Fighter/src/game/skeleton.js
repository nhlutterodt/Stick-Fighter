// Core skeleton and forward kinematics for stick-fighter animation

/**
 * A single bone in the skeleton hierarchy.
 */
export class Bone {
  constructor(length, parent = null) {
    this.length = length;
    this.localAngle = 0;    // angle relative to parent
    this.worldAngle = 0;    // absolute angle in world space
    this.parent = parent;
    this.children = [];
    this.startPoint = { x: 0, y: 0 };
    this.endPoint = { x: length, y: 0 };
    if (parent) parent.addChild(this);
  }

  addChild(child) {
    this.children.push(child);
  }

  /**
   * Recursively update world transform for this bone and its children.
   * @param {{x:number,y:number}} parentStart - world start point of parent
   * @param {number} parentAngle - world angle of parent
   */
  updateWorldTransform(parentStart = { x: 0, y: 0 }, parentAngle = 0) {
    this.worldAngle = parentAngle + this.localAngle;
    this.startPoint.x = parentStart.x;
    this.startPoint.y = parentStart.y;
    this.endPoint.x = this.startPoint.x + Math.cos(this.worldAngle) * this.length;
    this.endPoint.y = this.startPoint.y + Math.sin(this.worldAngle) * this.length;
    this.children.forEach(child => child.updateWorldTransform(this.endPoint, this.worldAngle));
  }
}

/**
 * A skeleton containing a root bone and convenience methods.
 */
export class Skeleton {
  constructor(rootBone) {
    this.root = rootBone;
  }

  /**
   * Update the entire bone chain (FK) from the root.
   */
  update() {
    this.root.updateWorldTransform({ x: 0, y: 0 }, 0);
  }
}

/**
 * Draw a cylindrical bone between two points.
 * @param {CanvasRenderingContext2D} ctx
 * @param {{x:number,y:number}} p1
 * @param {{x:number,y:number}} p2
 * @param {number} width
 * @param {string} color
 */
export function drawBoneCylinder(ctx, p1, p2, width, color) {
  const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
  ctx.save();
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.strokeStyle = color;
  ctx.beginPath();
  ctx.moveTo(p1.x, p1.y);
  ctx.lineTo(p2.x, p2.y);
  ctx.stroke();
  ctx.restore();
}
