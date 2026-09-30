/** Shown the moment a page in the app is opened, while its data loads. Shapes follow the dashboard. */
export default function AppLoading() {
  return (
    <div role="status" aria-busy="true" className="flex flex-col gap-3 px-4 pb-4 md:px-8">
      <span className="sr-only">Loading</span>
      <div className="flex flex-col gap-4 pt-1 pb-2">
        <div className="skeleton h-9 w-60 max-w-full rounded-full md:h-10" />
        <div className="skeleton h-4 w-40 rounded-full" />
      </div>
      <div className="skeleton h-[220px] rounded-[28px] sm:h-[260px]" />
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <div className="skeleton h-[280px] rounded-[28px] lg:col-span-2" />
        <div className="skeleton h-[280px] rounded-[28px]" />
      </div>
    </div>
  );
}
