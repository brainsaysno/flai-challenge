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
            <TableHead>Contact</TableHead>
            <TableHead>Vehicle</TableHead>
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
              <TableCell>
                <div className="flex flex-col">
                  <span>{record.first_name} {record.last_name}</span>
                  <span className="text-xs text-muted-foreground">{record.phone}</span>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex flex-col">
                  <span>{record.year} {record.make} {record.model}</span>
                  <span className="text-xs text-muted-foreground">{record.vin}</span>
                </div>
              </TableCell>
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
