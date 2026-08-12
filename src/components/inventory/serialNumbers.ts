export function parseSerialNumbersInput(value: string): string[] {
  const serials = value.split(/[\n,;]+/).map((item) => item.trim()).filter(Boolean);
  return Array.from(new Set(serials));
}

export function formatSerialNumbersInput(values: string[] | null | undefined): string {
  return (values || []).join('\n');
}
