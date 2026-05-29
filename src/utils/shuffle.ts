/** Fisher-Yates shuffle — orden realmente aleatorio */
export function shuffle<T>(array: T[], random = Math.random): T[] {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** Puntuación + aleatoriedad para sugerencias dinámicas */
export function scoreWithJitter(score: number, random = Math.random): number {
  return score + random() * 40;
}
