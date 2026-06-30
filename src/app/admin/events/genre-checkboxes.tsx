type G = { id: number; nameHe: string; emoji: string | null };

export function GenreCheckboxes({
  genres,
  selected = [],
}: {
  genres: G[];
  selected?: number[];
}) {
  const sel = new Set(selected);
  return (
    <div className="genrechips">
      {genres.map((g) => (
        <label key={g.id} className="genrechk">
          <input type="checkbox" name="genreIds" value={g.id} defaultChecked={sel.has(g.id)} />
          <span>{g.emoji} {g.nameHe}</span>
        </label>
      ))}
    </div>
  );
}
