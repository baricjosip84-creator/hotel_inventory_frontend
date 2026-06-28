declare const qrCodeSvg: {
  createQrSvgDataUri(text: string, cellSize?: number, margin?: number): string;
  createQrSvgMarkup(text: string, cellSize?: number, margin?: number): string;
};
export default qrCodeSvg;
