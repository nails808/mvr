declare module 'bwip-js' {
  export interface BwipJsOptions {
    bcid: string;
    text: string;
    scale?: number;
    padding?: number;
    height?: number;
    width?: number;
    backgroundcolor?: string;
    barcolor?: string;
    includetext?: boolean;
  }

  export function toCanvas(
    canvas: HTMLCanvasElement,
    options: BwipJsOptions,
  ): HTMLCanvasElement;

  const bwipjs: {
    toCanvas: typeof toCanvas;
  };
  export default bwipjs;
}
