type MetricCardProps = {
  title: string;
  value: string;
  caption: string;
};

export function MetricCard({ title, value, caption }: MetricCardProps) {
  return (
    <article className="metric-card">
      <div className="metric-card__label">{title}</div>
      <div className="metric-card__value">{value}</div>
      <p className="metric-card__caption">{caption}</p>
    </article>
  );
}
