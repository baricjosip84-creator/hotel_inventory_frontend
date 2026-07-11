import qrCodeSvg from './qrCodeSvg';

export type BarcodeSymbology = 'CODE128' | 'EAN13' | 'QR';
export type BarcodeLabelTemplate = 'default' | 'compact' | 'shelf';

export type PrintableBarcodeLabel = {
  id?: string;
  product_name?: string | null;
  product_unit?: string | null;
  barcode_value: string;
  barcode_type: string;
  label_template?: string | null;
  lot_number?: string | null;
  batch_number?: string | null;
  expiry_date?: string | null;
};

const CODE128_PATTERNS = [
  '212222','222122','222221','121223','121322','131222','122213','122312','132212','221213','221312','231212',
  '112232','122132','122231','113222','123122','123221','223211','221132','221231','213212','223112','312131',
  '311222','321122','321221','312212','322112','322211','212123','212321','232121','111323','131123','131321',
  '112313','132113','132311','211313','231113','231311','112133','112331','132131','113123','113321','133121',
  '313121','211331','231131','213113','213311','213131','311123','311321','331121','312113','312311','332111',
  '314111','221411','431111','111224','111422','121124','121421','141122','141221','112214','112412','122114',
  '122411','142112','142211','241211','221114','413111','241112','134111','111242','121142','121241','114212',
  '124112','124211','411212','421112','421211','212141','214121','412121','111143','111341','131141','114113',
  '114311','411113','411311','113141','114131','311141','411131','211412','211214','211232','2331112'
] as const;

const EAN_L = ['0001101','0011001','0010011','0111101','0100011','0110001','0101111','0111011','0110111','0001011'];
const EAN_G = ['0100111','0110011','0011011','0100001','0011101','0111001','0000101','0010001','0001001','0010111'];
const EAN_R = ['1110010','1100110','1101100','1000010','1011100','1001110','1010000','1000100','1001000','1110100'];
const EAN_PARITY = ['LLLLLL','LLGLGG','LLGGLG','LLGGGL','LGLLGG','LGGLLG','LGGGLL','LGLGLG','LGLGGL','LGGLGL'];

function escapeXml(value: unknown): string {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&apos;'
  })[character] ?? character);
}

function randomDigits(length: number): string {
  const bytes = new Uint8Array(length);
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(bytes);
  } else {
    for (let index = 0; index < bytes.length; index += 1) bytes[index] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes, (value) => String(value % 10)).join('');
}

function randomHex(length: number): string {
  const bytes = new Uint8Array(Math.ceil(length / 2));
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(bytes);
  } else {
    for (let index = 0; index < bytes.length; index += 1) bytes[index] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('').slice(0, length).toUpperCase();
}

export function calculateEan13CheckDigit(twelveDigits: string): string {
  if (!/^\d{12}$/.test(twelveDigits)) throw new Error('EAN-13 requires 12 digits before the check digit.');
  const sum = [...twelveDigits].reduce((total, digit, index) => total + Number(digit) * (index % 2 === 0 ? 1 : 3), 0);
  return String((10 - (sum % 10)) % 10);
}

export function normalizeEan13(value: string): string {
  const cleaned = value.trim();
  if (!/^\d{12,13}$/.test(cleaned)) throw new Error('EAN-13 must contain 12 or 13 digits.');
  const normalized = cleaned.length === 12 ? `${cleaned}${calculateEan13CheckDigit(cleaned)}` : cleaned;
  if (calculateEan13CheckDigit(normalized.slice(0, 12)) !== normalized.slice(12)) {
    throw new Error('EAN-13 check digit is invalid.');
  }
  return normalized;
}

export function generateBarcodeValue(type: BarcodeSymbology): string {
  if (type === 'EAN13') {
    const firstTwelve = randomDigits(12);
    return `${firstTwelve}${calculateEan13CheckDigit(firstTwelve)}`;
  }
  return `LBL-${randomHex(16)}`;
}

export function normalizeBarcodeValue(value: string, type: BarcodeSymbology): string {
  const cleaned = value.trim();
  if (type === 'EAN13') return normalizeEan13(cleaned);
  if (!cleaned) throw new Error('Barcode value is required.');
  if (type === 'CODE128' && !/^[\x20-\x7E]+$/.test(cleaned)) {
    throw new Error('Code 128 supports printable letters, numbers, and symbols only.');
  }
  return cleaned;
}

function createCode128SvgMarkup(value: string): string {
  if (!/^[\x20-\x7E]+$/.test(value)) throw new Error('Code 128 supports printable ASCII characters only.');
  const startCode = 104;
  const dataCodes = [...value].map((character) => character.charCodeAt(0) - 32);
  const checksum = (startCode + dataCodes.reduce((total, code, index) => total + code * (index + 1), 0)) % 103;
  const codes = [startCode, ...dataCodes, checksum, 106];
  const moduleWidth = 2;
  const quietZone = 10;
  const barHeight = 74;
  let moduleOffset = quietZone;
  const rectangles: string[] = [];

  for (const code of codes) {
    const pattern = CODE128_PATTERNS[code];
    if (!pattern) throw new Error('Unable to encode Code 128 value.');
    let drawBar = true;
    for (const widthCharacter of pattern) {
      const width = Number(widthCharacter);
      if (drawBar) {
        rectangles.push(`<rect x="${moduleOffset * moduleWidth}" y="0" width="${width * moduleWidth}" height="${barHeight}"/>`);
      }
      moduleOffset += width;
      drawBar = !drawBar;
    }
  }

  const totalWidth = (moduleOffset + quietZone) * moduleWidth;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalWidth} 98" role="img" aria-label="Code 128 barcode"><rect width="100%" height="100%" fill="#fff"/><g fill="#000">${rectangles.join('')}</g><text x="${totalWidth / 2}" y="92" font-family="Arial, sans-serif" font-size="14" text-anchor="middle" fill="#111">${escapeXml(value)}</text></svg>`;
}

function createEan13SvgMarkup(rawValue: string): string {
  const value = normalizeEan13(rawValue);
  const firstDigit = Number(value[0]);
  const parity = EAN_PARITY[firstDigit];
  let bits = '101';
  for (let index = 1; index <= 6; index += 1) {
    const digit = Number(value[index]);
    bits += parity[index - 1] === 'L' ? EAN_L[digit] : EAN_G[digit];
  }
  bits += '01010';
  for (let index = 7; index <= 12; index += 1) bits += EAN_R[Number(value[index])];
  bits += '101';

  const moduleWidth = 3;
  const quietZone = 11;
  const normalHeight = 72;
  const guardHeight = 82;
  const rectangles: string[] = [];
  for (let index = 0; index < bits.length; index += 1) {
    if (bits[index] !== '1') continue;
    const isGuard = index < 3 || (index >= 45 && index < 50) || index >= 92;
    rectangles.push(`<rect x="${(quietZone + index) * moduleWidth}" y="0" width="${moduleWidth}" height="${isGuard ? guardHeight : normalHeight}"/>`);
  }
  const totalWidth = (quietZone * 2 + 95) * moduleWidth;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalWidth} 108" role="img" aria-label="EAN-13 barcode"><rect width="100%" height="100%" fill="#fff"/><g fill="#000">${rectangles.join('')}</g><text x="${totalWidth / 2}" y="103" font-family="Arial, sans-serif" font-size="17" letter-spacing="3" text-anchor="middle" fill="#111">${escapeXml(value)}</text></svg>`;
}

function createQrBarcodeSvgMarkup(value: string): string {
  return qrCodeSvg
    .createQrSvgMarkup(value, 5, 4)
    .replaceAll('Authenticator setup QR code', 'QR barcode');
}

export function createBarcodeGraphicSvgMarkup(value: string, type: BarcodeSymbology): string {
  const normalized = normalizeBarcodeValue(value, type);
  if (type === 'EAN13') return createEan13SvgMarkup(normalized);
  if (type === 'QR') return createQrBarcodeSvgMarkup(normalized);
  return createCode128SvgMarkup(normalized);
}

export function svgMarkupToDataUri(markup: string): string {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(markup)}`;
}

function labelTemplateDimensions(template: string | null | undefined) {
  if (template === 'compact') return { width: 340, height: 190, graphicX: 18, graphicY: 54, graphicWidth: 304, graphicHeight: 90, fontSize: 18 };
  if (template === 'shelf') return { width: 520, height: 230, graphicX: 175, graphicY: 42, graphicWidth: 325, graphicHeight: 132, fontSize: 24 };
  return { width: 420, height: 250, graphicX: 24, graphicY: 70, graphicWidth: 372, graphicHeight: 120, fontSize: 22 };
}

function formatExpiry(value?: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
}

export function createBarcodeLabelSvgMarkup(label: PrintableBarcodeLabel): string {
  const type = (label.barcode_type || 'CODE128') as BarcodeSymbology;
  const template = label.label_template || 'default';
  const dimensions = labelTemplateDimensions(template);
  const graphic = createBarcodeGraphicSvgMarkup(label.barcode_value, type);
  const graphicUri = svgMarkupToDataUri(graphic);
  const metadata = [
    label.lot_number ? `Lot: ${label.lot_number}` : '',
    label.batch_number ? `Batch: ${label.batch_number}` : '',
    label.expiry_date ? `Expiry: ${formatExpiry(label.expiry_date)}` : ''
  ].filter(Boolean);

  if (template === 'shelf') {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${dimensions.width} ${dimensions.height}" width="${dimensions.width}" height="${dimensions.height}" role="img" aria-label="Printable inventory barcode label"><rect x="1" y="1" width="${dimensions.width - 2}" height="${dimensions.height - 2}" rx="12" fill="#fff" stroke="#111" stroke-width="2"/><text x="22" y="42" font-family="Arial, sans-serif" font-size="${dimensions.fontSize}" font-weight="700" fill="#111">${escapeXml(label.product_name || 'Inventory product')}</text><text x="22" y="72" font-family="Arial, sans-serif" font-size="15" fill="#333">${escapeXml(label.product_unit || '')}</text><text x="22" y="112" font-family="Arial, sans-serif" font-size="14" fill="#111">${escapeXml(metadata[0] || '')}</text><text x="22" y="137" font-family="Arial, sans-serif" font-size="14" fill="#111">${escapeXml(metadata[1] || '')}</text><text x="22" y="162" font-family="Arial, sans-serif" font-size="14" fill="#111">${escapeXml(metadata[2] || '')}</text><text x="22" y="205" font-family="Arial, sans-serif" font-size="12" fill="#555">${escapeXml(label.barcode_value)}</text><image href="${escapeXml(graphicUri)}" x="${dimensions.graphicX}" y="${dimensions.graphicY}" width="${dimensions.graphicWidth}" height="${dimensions.graphicHeight}" preserveAspectRatio="xMidYMid meet"/></svg>`;
  }

  const metadataText = metadata.join(' · ');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${dimensions.width} ${dimensions.height}" width="${dimensions.width}" height="${dimensions.height}" role="img" aria-label="Printable inventory barcode label"><rect x="1" y="1" width="${dimensions.width - 2}" height="${dimensions.height - 2}" rx="12" fill="#fff" stroke="#111" stroke-width="2"/><text x="${dimensions.width / 2}" y="32" font-family="Arial, sans-serif" font-size="${dimensions.fontSize}" font-weight="700" text-anchor="middle" fill="#111">${escapeXml(label.product_name || 'Inventory product')}</text><text x="${dimensions.width / 2}" y="52" font-family="Arial, sans-serif" font-size="12" text-anchor="middle" fill="#444">${escapeXml(metadataText)}</text><image href="${escapeXml(graphicUri)}" x="${dimensions.graphicX}" y="${dimensions.graphicY}" width="${dimensions.graphicWidth}" height="${dimensions.graphicHeight}" preserveAspectRatio="xMidYMid meet"/><text x="${dimensions.width / 2}" y="${dimensions.height - 16}" font-family="Arial, sans-serif" font-size="12" text-anchor="middle" fill="#555">${escapeXml(label.barcode_value)}</text></svg>`;
}
