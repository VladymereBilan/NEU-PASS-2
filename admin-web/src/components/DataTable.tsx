export function DataTable({
  columns,
  rows
}: {
  columns: string[];
  rows: Array<Array<string>>;
}) {
  return (
    <div className="overflow-hidden rounded-3xl border border-emerald-500/20">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-emerald-500/10 text-left text-sm">
          <thead className="bg-white/5 text-gray-400">
            <tr>
              {columns.map((column) => (
                <th key={column} className="px-4 py-3 font-semibold">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-emerald-500/10 text-white">
            {rows.map((row, rowIndex) => (
              <tr key={`${rowIndex}-${row[0] ?? "row"}`} className="hover:bg-white/5">
                {row.map((cell, cellIndex) => (
                  <td key={`${rowIndex}-${cellIndex}`} className="px-4 py-3">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
