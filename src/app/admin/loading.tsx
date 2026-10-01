export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading">
      <div className="skeleton" style={{ height: 32, width: 260 }} />
      <div className="skeleton mt-3" style={{ height: 96 }} />
      <div className="skeleton mt-3" style={{ height: 220 }} />
    </div>
  );
}
