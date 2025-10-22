import { type CsvRecord } from "~/lib/schemas";

interface DataTableProps {
  data: CsvRecord[];
}

export function DataTable({ data }: DataTableProps) {
  if (data.length === 0) {
    return (
      <div className="text-center text-muted-foreground">No data to display</div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full border-collapse text-sm">
        <thead className="bg-muted">
          <tr>
            <th className="border-b px-4 py-2 text-left font-medium">Phone</th>
            <th className="border-b px-4 py-2 text-left font-medium">
              First Name
            </th>
            <th className="border-b px-4 py-2 text-left font-medium">
              Last Name
            </th>
            <th className="border-b px-4 py-2 text-left font-medium">VIN</th>
            <th className="border-b px-4 py-2 text-left font-medium">Year</th>
            <th className="border-b px-4 py-2 text-left font-medium">Make</th>
            <th className="border-b px-4 py-2 text-left font-medium">Model</th>
            <th className="border-b px-4 py-2 text-left font-medium">
              Recall Code
            </th>
            <th className="border-b px-4 py-2 text-left font-medium">
              Recall Description
            </th>
            <th className="border-b px-4 py-2 text-left font-medium">
              Language
            </th>
            <th className="border-b px-4 py-2 text-left font-medium">
              Priority
            </th>
          </tr>
        </thead>
        <tbody>
          {data.map((record, index) => (
            <tr key={index} className="hover:bg-muted/50">
              <td className="border-b px-4 py-2">{record.phone}</td>
              <td className="border-b px-4 py-2">{record.first_name}</td>
              <td className="border-b px-4 py-2">{record.last_name}</td>
              <td className="border-b px-4 py-2">{record.vin}</td>
              <td className="border-b px-4 py-2">{record.year}</td>
              <td className="border-b px-4 py-2">{record.make}</td>
              <td className="border-b px-4 py-2">{record.model}</td>
              <td className="border-b px-4 py-2">{record.recall_code}</td>
              <td className="border-b px-4 py-2">{record.recall_desc}</td>
              <td className="border-b px-4 py-2">{record.language}</td>
              <td className="border-b px-4 py-2">{record.priority}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
