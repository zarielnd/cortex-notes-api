export function ms(value: string): number {
  const num = parseInt(value, 10);
  const unit = value.replace(/[0-9]/g, '');

  const map: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };

  return num * (map[unit] ?? 1000);
}
