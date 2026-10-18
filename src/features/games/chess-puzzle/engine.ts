const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

export const pieceGlyphs: Record<string, string> = {
  K: '♔',
  Q: '♕',
  R: '♖',
  B: '♗',
  N: '♘',
  P: '♙',
  k: '♚',
  q: '♛',
  r: '♜',
  b: '♝',
  n: '♞',
  p: '♟',
};

export function parseFen(fen: string) {
  const squares: Array<string | null> = [];
  for (const rank of fen.split(' ')[0]!.split('/')) {
    for (const symbol of rank) {
      if (/\d/.test(symbol)) squares.push(...Array<null>(Number(symbol)).fill(null));
      else squares.push(symbol);
    }
  }
  return squares.slice(0, 64);
}

export function squareName(index: number) {
  return `${files[index % 8]}${8 - Math.floor(index / 8)}`;
}
