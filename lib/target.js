// belum bayar sama sekali | cicil (>0, <target) | lunas (>=target, atau gak ada target terdaftar)
export function hitungStatus(totalDibayar, target) {
  const n = Number(totalDibayar) || 0;
  if (!n) return 'belum';
  if (!target || n >= target) return 'lunas';
  return 'cicil';
}
