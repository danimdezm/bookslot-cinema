import './CardPreview.css';

export function CardPreview({ holder }: { holder: string }) {
  return (
    <div className="card-visual" aria-hidden>
      <div className="card-visual__chip" />
      <span className="card-visual__number tabular">4242 4242 4242 4242</span>
      <div className="card-visual__foot">
        <span>{holder.toUpperCase()}</span>
        <span className="tabular">12/34</span>
      </div>
    </div>
  );
}
