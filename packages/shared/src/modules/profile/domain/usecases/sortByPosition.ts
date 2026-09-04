interface Positioned {
  position: number;
  createdAt: Date;
}

export function sortByPosition<T extends Positioned>(items: T[]): T[] {
  return [...items].sort((a, b) => a.position - b.position || a.createdAt.getTime() - b.createdAt.getTime());
}
