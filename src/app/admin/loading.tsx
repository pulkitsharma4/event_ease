// app/admin/loading.tsx
export default function AdminLoading() {
  return (
    <div className="p-6">
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <span className="inline-block h-4 w-4 animate-spin rounded-full border border-gray-400 border-t-transparent" />
        Loading…
      </div>
    </div>
  );
}
