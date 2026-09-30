/** Chat opens with its frame in place: the chat list on wide screens and the composer at the bottom. */
export default function ChatLoading() {
  return (
    <div role="status" aria-busy="true" className="grid h-full min-h-0 grid-cols-1 gap-3 px-2 pb-2 md:grid-cols-[272px_minmax(0,1fr)] md:px-3 md:pb-3">
      <span className="sr-only">Loading</span>
      <div className="skeleton hidden rounded-[28px] md:block" />
      <div className="flex min-h-0 flex-col justify-end gap-3 p-2">
        <div className="skeleton ml-auto h-12 w-3/5 rounded-[28px]" />
        <div className="skeleton h-20 w-4/5 rounded-[28px]" />
        <div className="skeleton mt-4 h-14 rounded-full" />
      </div>
    </div>
  );
}
