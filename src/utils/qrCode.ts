/*
  src/utils/qrCode.ts

  PURPOSE
  -------
  Generate a real, standards-compatible QR code image in the browser without
  adding a new frontend dependency.

  This mirrors the backend QR utility so printable shipment sheets can show
  a scannable QR image while the scanner continues to read the same raw
  shipments.qr_code value.

  SCOPE
  -----
  The built-in generator targets shipment QR values produced by the backend.
  It uses QR Code version 3, low error correction, byte mode, and mask 0.

  Version 3-L supports up to 53 UTF-8 bytes, which covers generated values like:
    SHIP-1712345678901-A1B2C3D4

  If a manually supplied QR value is longer, callers should show the raw value
  and skip the image instead of blocking printing.
*/

const VERSION = 3;
const SIZE = 21 + VERSION * 4;
const DATA_CODEWORDS = 55;
const ECC_CODEWORDS = 15;
const TOTAL_CODEWORDS = DATA_CODEWORDS + ECC_CODEWORDS;
export const MAX_QR_BYTE_LENGTH = 53;
const FORMAT_XOR_MASK = 0x5412;
const FORMAT_POLY = 0x537;

type QrMatrixState = {
  modules: boolean[][];
  reserved: boolean[][];
};

function utf8Bytes(value: string): number[] {
  return Array.from(new TextEncoder().encode(String(value)));
}

function createMatrix(): QrMatrixState {
  return {
    modules: Array.from({ length: SIZE }, () => Array(SIZE).fill(false)),
    reserved: Array.from({ length: SIZE }, () => Array(SIZE).fill(false))
  };
}

function isInBounds(row: number, col: number): boolean {
  return row >= 0 && row < SIZE && col >= 0 && col < SIZE;
}

function setFunctionModule(matrix: QrMatrixState, row: number, col: number, dark: boolean): void {
  if (!isInBounds(row, col)) return;

  matrix.modules[row][col] = Boolean(dark);
  matrix.reserved[row][col] = true;
}

function drawFinderPattern(matrix: QrMatrixState, top: number, left: number): void {
  for (let row = -1; row <= 7; row += 1) {
    for (let col = -1; col <= 7; col += 1) {
      const targetRow = top + row;
      const targetCol = left + col;

      if (!isInBounds(targetRow, targetCol)) continue;

      const inPattern = row >= 0 && row <= 6 && col >= 0 && col <= 6;
      const dark = inPattern && (
        row === 0 || row === 6 || col === 0 || col === 6 ||
        (row >= 2 && row <= 4 && col >= 2 && col <= 4)
      );

      setFunctionModule(matrix, targetRow, targetCol, dark);
    }
  }
}

function drawAlignmentPattern(matrix: QrMatrixState, centerRow: number, centerCol: number): void {
  for (let row = -2; row <= 2; row += 1) {
    for (let col = -2; col <= 2; col += 1) {
      const distance = Math.max(Math.abs(row), Math.abs(col));
      setFunctionModule(matrix, centerRow + row, centerCol + col, distance !== 1);
    }
  }
}

function reserveFormatAreas(matrix: QrMatrixState): void {
  for (let i = 0; i <= 8; i += 1) {
    if (i !== 6) {
      setFunctionModule(matrix, 8, i, false);
      setFunctionModule(matrix, i, 8, false);
    }
  }

  for (let i = 0; i < 8; i += 1) {
    setFunctionModule(matrix, SIZE - 1 - i, 8, false);
  }

  for (let i = 0; i < 7; i += 1) {
    setFunctionModule(matrix, 8, SIZE - 1 - i, false);
  }
}

function drawFunctionPatterns(matrix: QrMatrixState): void {
  drawFinderPattern(matrix, 0, 0);
  drawFinderPattern(matrix, 0, SIZE - 7);
  drawFinderPattern(matrix, SIZE - 7, 0);

  for (let i = 8; i < SIZE - 8; i += 1) {
    const dark = i % 2 === 0;
    setFunctionModule(matrix, 6, i, dark);
    setFunctionModule(matrix, i, 6, dark);
  }

  drawAlignmentPattern(matrix, 22, 22);
  setFunctionModule(matrix, 4 * VERSION + 9, 8, true);
  reserveFormatAreas(matrix);
}

const gfTables = (() => {
  const exp = Array(512).fill(0);
  const log = Array(256).fill(0);
  let value = 1;

  for (let i = 0; i < 255; i += 1) {
    exp[i] = value;
    log[value] = i;
    value <<= 1;
    if (value & 0x100) {
      value ^= 0x11d;
    }
  }

  for (let i = 255; i < 512; i += 1) {
    exp[i] = exp[i - 255];
  }

  return { exp, log };
})();

function gfMultiply(left: number, right: number): number {
  if (left === 0 || right === 0) return 0;
  return gfTables.exp[gfTables.log[left] + gfTables.log[right]];
}

function reedSolomonGenerator(degree: number): number[] {
  let result = [1];

  for (let i = 0; i < degree; i += 1) {
    const next = Array(result.length + 1).fill(0);

    for (let j = 0; j < result.length; j += 1) {
      next[j] ^= result[j];
      next[j + 1] ^= gfMultiply(result[j], gfTables.exp[i]);
    }

    result = next;
  }

  return result;
}

function reedSolomonRemainder(data: number[], degree: number): number[] {
  const generator = reedSolomonGenerator(degree);
  const result = Array(degree).fill(0);

  for (const byte of data) {
    const factor = byte ^ result[0];

    for (let i = 0; i < degree - 1; i += 1) {
      result[i] = result[i + 1];
    }
    result[degree - 1] = 0;

    for (let i = 0; i < degree; i += 1) {
      result[i] ^= gfMultiply(generator[i + 1], factor);
    }
  }

  return result;
}

function appendBits(bits: number[], value: number, length: number): void {
  for (let i = length - 1; i >= 0; i -= 1) {
    bits.push((value >>> i) & 1);
  }
}

function bitsToBytes(bits: number[]): number[] {
  const bytes: number[] = [];

  for (let i = 0; i < bits.length; i += 8) {
    let value = 0;
    for (let j = 0; j < 8; j += 1) {
      value = (value << 1) | bits[i + j];
    }
    bytes.push(value);
  }

  return bytes;
}

function buildCodewords(value: string): number[] {
  const bytes = utf8Bytes(value);

  if (bytes.length > MAX_QR_BYTE_LENGTH) {
    throw new Error(`QR value is too long for built-in generator: ${bytes.length} bytes`);
  }

  const bits: number[] = [];

  appendBits(bits, 0b0100, 4);
  appendBits(bits, bytes.length, 8);

  for (const byte of bytes) {
    appendBits(bits, byte, 8);
  }

  const totalDataBits = DATA_CODEWORDS * 8;
  const terminatorLength = Math.min(4, totalDataBits - bits.length);
  appendBits(bits, 0, terminatorLength);

  while (bits.length % 8 !== 0) {
    bits.push(0);
  }

  const dataCodewords = bitsToBytes(bits);

  for (let padIndex = 0; dataCodewords.length < DATA_CODEWORDS; padIndex += 1) {
    dataCodewords.push(padIndex % 2 === 0 ? 0xec : 0x11);
  }

  const ecc = reedSolomonRemainder(dataCodewords, ECC_CODEWORDS);
  const codewords = [...dataCodewords, ...ecc];

  if (codewords.length !== TOTAL_CODEWORDS) {
    throw new Error('Unexpected QR codeword length');
  }

  return codewords;
}

function applyMask0(row: number, col: number, dark: boolean): boolean {
  return ((row + col) % 2 === 0) ? !dark : dark;
}

function placeData(matrix: QrMatrixState, codewords: number[]): void {
  const bits: number[] = [];

  for (const codeword of codewords) {
    appendBits(bits, codeword, 8);
  }

  let bitIndex = 0;
  let upward = true;

  for (let right = SIZE - 1; right >= 1; right -= 2) {
    if (right === 6) {
      right -= 1;
    }

    for (let vertical = 0; vertical < SIZE; vertical += 1) {
      const row = upward ? SIZE - 1 - vertical : vertical;

      for (let offset = 0; offset < 2; offset += 1) {
        const col = right - offset;

        if (matrix.reserved[row][col]) continue;

        const dark = bitIndex < bits.length ? bits[bitIndex] === 1 : false;
        matrix.modules[row][col] = applyMask0(row, col, dark);
        bitIndex += 1;
      }
    }

    upward = !upward;
  }
}

function bitLength(value: number): number {
  let length = 0;
  let current = value;

  while (current > 0) {
    length += 1;
    current >>>= 1;
  }

  return length;
}

function getFormatBits(): number {
  const data = (0b01 << 3) | 0b000;
  let remainder = data << 10;

  while (bitLength(remainder) >= 11) {
    remainder ^= FORMAT_POLY << (bitLength(remainder) - 11);
  }

  return ((data << 10) | remainder) ^ FORMAT_XOR_MASK;
}

function drawFormatBits(matrix: QrMatrixState): void {
  const formatBits = getFormatBits();

  for (let i = 0; i < 15; i += 1) {
    const dark = ((formatBits >>> i) & 1) === 1;

    if (i < 6) {
      setFunctionModule(matrix, 8, i, dark);
    } else if (i === 6) {
      setFunctionModule(matrix, 8, 7, dark);
    } else if (i === 7) {
      setFunctionModule(matrix, 8, 8, dark);
    } else if (i === 8) {
      setFunctionModule(matrix, 7, 8, dark);
    } else {
      setFunctionModule(matrix, 14 - i, 8, dark);
    }

    if (i < 8) {
      setFunctionModule(matrix, SIZE - 1 - i, 8, dark);
    } else {
      setFunctionModule(matrix, 8, SIZE - 15 + i, dark);
    }
  }
}

export function canCreateQrImage(value: string): boolean {
  return utf8Bytes(value).length <= MAX_QR_BYTE_LENGTH;
}

export function createQrSvg(value: string, options: { quietZone?: number; moduleSize?: number } = {}): string {
  const quietZone = Number.isFinite(Number(options.quietZone)) ? Number(options.quietZone) : 4;
  const moduleSize = Number.isFinite(Number(options.moduleSize)) ? Number(options.moduleSize) : 8;
  const matrix = createMatrix();

  drawFunctionPatterns(matrix);
  placeData(matrix, buildCodewords(value));
  drawFormatBits(matrix);

  const imageSize = (SIZE + quietZone * 2) * moduleSize;
  const darkRects: string[] = [];

  for (let row = 0; row < SIZE; row += 1) {
    for (let col = 0; col < SIZE; col += 1) {
      if (!matrix.modules[row][col]) continue;

      darkRects.push(
        `<rect x="${(col + quietZone) * moduleSize}" y="${(row + quietZone) * moduleSize}" width="${moduleSize}" height="${moduleSize}"/>`
      );
    }
  }

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${imageSize}" height="${imageSize}" viewBox="0 0 ${imageSize} ${imageSize}" shape-rendering="crispEdges">`,
    '<rect width="100%" height="100%" fill="#ffffff"/>',
    `<g fill="#000000">${darkRects.join('')}</g>`,
    '</svg>'
  ].join('');
}

export function createQrDataUrl(value: string, options: { quietZone?: number; moduleSize?: number } = {}): string {
  const svg = createQrSvg(value, options);
  return `data:image/svg+xml;base64,${window.btoa(unescape(encodeURIComponent(svg)))}`;
}
