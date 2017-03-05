/**
 * @class Texture
 */
class Texture {
  /**
   * @param {CanvasRenderingContext2D} buffer
   */
  constructor(buffer) {
    let view = buffer.canvas;
    this.view = view;
    this.context = buffer;
    this.texture = new PIXI.Sprite(PIXI.Texture.fromCanvas(view));
    this.data = buffer.getImageData(0, 0, view.width, view.height).data;
  }
};

export default Texture;
