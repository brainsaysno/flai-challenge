"use client";

import { useRef, useState } from "react";
import Papa from "papaparse";
import { X } from "lucide-react";
import Handlebars from "handlebars";
import { FileDropzone } from "~/components/FileDropzone";
import { csvRecordSchema, type CsvRecord } from "~/lib/schemas";
import { DataTable } from "~/components/DataTable";

export default function HomePage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [data, setData] = useState<CsvRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [template, setTemplate] = useState(
    "Hello {{first_name}} {{last_name}},\n\nYour {{year}} {{make}} {{model}} (VIN: {{vin}}) has an open recall.\n\nRecall: {{recall_code}}\nDescription: {{recall_desc}}\n\nPlease contact us at {{phone}}."
  );

  const handleReset = () => {
    setData([]);
    setError(null);
    setLoading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleBoxClick = () => {
    fileInputRef.current?.click();
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFileSelect(files);
    }
  };

  const handleFileSelect = (files: FileList | null) => {
    if (!files || files.length === 0) {
      setError("No file selected");
      return;
    }

    const file = files[0];

    if (!file) {
      setError("No file selected");
      return;
    }

    if (file.type !== "text/csv" && !file.name.endsWith(".csv")) {
      setError("Please upload a CSV file");
      return;
    }

    setLoading(true);
    setError(null);
    setData([]);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const validatedData: CsvRecord[] = [];
          const errors: string[] = [];

          results.data.forEach((row, index) => {
            try {
              const validated = csvRecordSchema.parse(row);
              validatedData.push(validated);
            } catch (err) {
              if (err instanceof Error) {
                errors.push(`Row ${index + 1}: ${err.message}`);
              }
            }
          });

          if (errors.length > 0) {
            setError(
              `Validation errors:\n${errors.slice(0, 5).join("\n")}${errors.length > 5 ? `\n... and ${errors.length - 5} more errors` : ""}`,
            );
          }

          if (validatedData.length > 0) {
            setData(validatedData);
          } else if (errors.length > 0) {
            setError("No valid records found in CSV");
          }
        } catch (err) {
          setError(
            err instanceof Error ? err.message : "Failed to parse CSV file",
          );
        } finally {
          setLoading(false);
        }
      },
      error: (err) => {
        setError(`Failed to parse CSV: ${err.message}`);
        setLoading(false);
      },
    });
  };

  const renderPreview = () => {
    if (data.length === 0) return "No data loaded yet";

    try {
      const compiledTemplate = Handlebars.compile(template);
      return compiledTemplate(data[0]);
    } catch (err) {
      return `Template error: ${err instanceof Error ? err.message : "Unknown error"}`;
    }
  };

  return (
    <div className="container mx-auto box-border py-8 h-screen">
      <div className="flex items-center gap-3">
        <h1 className="text-3xl font-bold">
          {data.length === 0 ? "Upload Open Recalls" : "Open Recalls"}
        </h1>
        {data.length > 0 && (
          <button
            onClick={handleReset}
            className="rounded-full p-1 hover:bg-muted transition-colors"
            aria-label="Clear data and upload new file"
          >
            <X className="h-6 w-6" />
          </button>
        )}

        {data.length > 0 && (
          <h2 className="text-xl font-semibold">
            Loaded {data.length} records
          </h2>
        )}
      </div>

      {data.length === 0 && (
        <FileDropzone
          fileInputRef={fileInputRef}
          handleBoxClick={handleBoxClick}
          handleDragOver={handleDragOver}
          handleDrop={handleDrop}
          handleFileSelect={handleFileSelect}
        />
      )}

      {loading && (
        <div className="mt-4 text-center text-muted-foreground">
          Loading and validating CSV...
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-md bg-red-50 p-4 text-red-800">
          <pre className="whitespace-pre-wrap text-sm">{error}</pre>
        </div>
      )}

      {data.length > 0 && (
        <div className="grid grid-rows-2 gap-4 h-full">
          <DataTable data={data} />

          <div className="border rounded-md">
            <div className="grid grid-cols-2 gap-4 pt-2 pb-1 px-4 border-b">
              <label className="text-lg font-semibold">Template</label>

              <label className="text-lg font-semibold">Preview</label>
            </div>
            <div className="overflow-auto grid grid-cols-2 gap-4 py-1 px-4">
              <textarea
                value={template}
                onChange={(e) => setTemplate(e.target.value)}
                className="flex-1 rounded-md font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your Handlebars template here..."
              />
              <pre className="whitespace-pre-wrap text-sm">{renderPreview()}</pre>
            </div>
          </div>
        </div>
      )
      }
    </div >
  );
}
