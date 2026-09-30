export default function PulseLoading() {
  return (
    <div role="status" aria-busy="true" className="flex flex-col gap-3">
      <span className="sr-only">Loading</span>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="skeleton h-[118px] rounded-[28px]" />
        ))}
      </div>
      <div className="skeleton h-[340px] rounded-[28px]" />
    </div>
  );
}
