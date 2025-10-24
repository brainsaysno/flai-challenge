import { X } from "lucide-react";

interface PageHeaderProps {
  dataLength: number;
  onReset: () => void;
}

export function PageHeader({ dataLength, onReset }: PageHeaderProps) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <h1 className="text-3xl font-bold">
        {dataLength === 0 ? "Upload Open Recalls" : "Open Recalls"}
      </h1>
      {dataLength > 0 && (
        <>
          <button
            onClick={onReset}
            className="rounded-full p-1 hover:bg-muted transition-colors"
            aria-label="Clear data and upload new file"
          >
            <X className="h-6 w-6" />
          </button>
          <h2 className="text-xl font-semibold">
            Loaded {dataLength} records
          </h2>
        </>
      )}
    </div>
  );
}
