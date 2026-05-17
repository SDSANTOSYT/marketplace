export default function StarRating({ rating, max = 5, size = 'sm', onChange }) {
  const stars = Array.from({ length: max }, (_, i) => i + 1)
  const s = size === 'sm' ? 'w-4 h-4' : 'w-6 h-6'
  return (
    <div className="flex items-center gap-0.5">
      {stars.map(star => (
        <button key={star} type="button" onClick={() => onChange?.(star)}
          className={`${s} ${onChange ? 'cursor-pointer hover:scale-110' : 'cursor-default'} transition-transform`}>
          <svg viewBox="0 0 24 24" className={`w-full h-full ${star <= Math.round(rating) ? 'fill-amber-400 text-amber-400' : 'fill-gray-200 text-gray-200'}`}>
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        </button>
      ))}
      {rating !== undefined && <span className="text-xs text-gray-500 ml-1">{Number(rating).toFixed(1)}</span>}
    </div>
  )
}
