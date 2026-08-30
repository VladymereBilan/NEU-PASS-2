export function DataTable({
  columns,
  rows
}: {
  columns: string[];
  rows: Array<Array<string>>;
}) {
  return (
    <div className="overflow-hidden rounded-3xl border border-emerald-200/20 bg-[rgba(11,35,28,0.86)] shadow-[0_10px_28px_rgba(11,110,60,0.10)]">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-white/10 text-left text-sm">
          <thead className="bg-white/5 text-slate-300">
            <tr>
              {columns.map((column) => (
                <th key={column} className="px-4 py-3 font-medium">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10 text-slate-100">
            {rows.map((row, rowIndex) => (
              <tr key={`${rowIndex}-${row[0] ?? "row"}`}> 
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
