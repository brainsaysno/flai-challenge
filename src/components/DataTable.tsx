import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { type CsvRecord } from "~/lib/schemas";

interface DataTableProps {
  data: CsvRecord[];
  selectedIndex?: number;
  onRowClick?: (index: number) => void;
}

export function DataTable({ data, selectedIndex, onRowClick }: DataTableProps) {
  if (data.length === 0) {
    return (
      <div className="text-center text-muted-foreground">No data to display</div>
    );
  }

  return (
    <div className="rounded-md border max-h-full overflow-y-scroll">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Phone</TableHead>
            <TableHead>First Name</TableHead>
            <TableHead>Last Name</TableHead>
            <TableHead>VIN</TableHead>
            <TableHead>Year</TableHead>
            <TableHead>Make</TableHead>
            <TableHead>Model</TableHead>
            <TableHead>Recall Code</TableHead>
            <TableHead>Recall Description</TableHead>
            <TableHead>Language</TableHead>
            <TableHead>Priority</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((record, index) => (
            <TableRow
              key={index}
              onClick={() => onRowClick?.(index)}
              className={`cursor-pointer hover:bg-muted/50 ${selectedIndex === index ? "bg-accent hover:bg-accent" : ""}`}
            >
              <TableCell>{record.phone}</TableCell>
              <TableCell>{record.first_name}</TableCell>
              <TableCell>{record.last_name}</TableCell>
              <TableCell>{record.vin}</TableCell>
              <TableCell>{record.year}</TableCell>
              <TableCell>{record.make}</TableCell>
              <TableCell>{record.model}</TableCell>
              <TableCell>{record.recall_code}</TableCell>
              <TableCell>{record.recall_desc}</TableCell>
              <TableCell>{record.language}</TableCell>
              <TableCell>{record.priority}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
