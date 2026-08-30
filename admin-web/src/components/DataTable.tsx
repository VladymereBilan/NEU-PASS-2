export function DataTable({
  columns,
  rows
}: {
  columns: string[];
  rows: Array<Array<string>>;
}) {
  return (
    <div className="overflow-hidden rounded-3xl border border-[#d8e3dc] bg-white">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-[#e5e7eb] text-left text-sm">
          <thead className="bg-[#f5faf6] text-[#4b5563]">
            <tr>
              {columns.map((column) => (
                <th key={column} className="px-4 py-3 font-semibold">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e5e7eb] text-[#111827]">
            {rows.map((row, rowIndex) => (
              <tr key={`${rowIndex}-${row[0] ?? "row"}`} className="hover:bg-[#f9fbf9]">
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
