"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Papa from "papaparse";
import { csvRecordSchema, type CsvRecord } from "~/lib/schemas";
import { DataTable } from "~/components/DataTable";
import { PageHeader } from "~/components/PageHeader";
import { FileUploadSection } from "~/components/FileUploadSection";
import { TemplateEditor } from "~/components/TemplateEditor";
import { sendSmsToAll, translateTemplate } from "./actions";
import { Alert, AlertDescription } from "~/components/ui/alert";

const DEFAULT_TEMPLATE = `Hello {{first_name}} {{last_name}},\n\nYour {{year}} {{make}} {{model}} (VIN: {{vin}}) has an open recall.\n\nRecall: {{recall_code}}\nDescription: {{recall_desc}}\n\nPlease reply with a time that works for you. We can schedule your recall service Monday-Friday between 9 AM and 5 PM, and it takes about an hour.`

export default function HomePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [data, setData] = useState<CsvRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [selectedCustomerIndex, setSelectedCustomerIndex] = useState(0);
  const [templates, setTemplates] = useState<Record<string, string>>({
    default: DEFAULT_TEMPLATE
  });
  const [activeLanguage, setActiveLanguage] = useState("default");

  const handleReset = () => {
    setData([]);
    setError(null);
    setLoading(false);
    setSelectedCustomerIndex(0);
    setTemplates({
      default: DEFAULT_TEMPLATE
    });
    setActiveLanguage("default");
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
    setSelectedCustomerIndex(0);

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

  const uniqueLanguages = Array.from(
    new Set(data.map((customer) => customer.language))
  );

  const handleCustomerSelect = (index: number) => {
    setSelectedCustomerIndex(index);
    const customer = data[index];
    if (customer && Object.keys(templates).length > 1) {
      setActiveLanguage(customer.language);
    }
  };

  const handleTranslate = async () => {
    setTranslating(true);
    setError(null);

    try {
      const defaultTemplate = templates.default;
      if (!defaultTemplate) {
        throw new Error("No default template found");
      }

      const translatedTemplates = await translateTemplate(
        defaultTemplate,
        uniqueLanguages
      );
      setTemplates(translatedTemplates);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to translate template"
      );
    } finally {
      setTranslating(false);
    }
  };

  const handleTemplateChange = (language: string, value: string) => {
    setTemplates((prev) => ({
      ...prev,
      [language]: value,
    }));
  };

  const handleSendSms = async () => {
    setSending(true);
    setError(null);

    try {
      const result = await sendSmsToAll(data, templates);
      console.log(`Successfully queued ${result.count} SMS messages`);
      router.push(`/campaigns/${result.campaignId}`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to send SMS to queue"
      );
      setSending(false);
    }
  };

  return (
    <div className="container mx-auto box-border py-8 h-screen">
      <PageHeader dataLength={data.length} onReset={handleReset} />

      {data.length === 0 && (
        <FileUploadSection
          fileInputRef={fileInputRef}
          loading={loading}
          error={error}
          onBoxClick={handleBoxClick}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onFileSelect={handleFileSelect}
        />
      )}

      {data.length > 0 && error && (
        <Alert variant="destructive" className="mt-4">
          <AlertDescription>
            <pre className="whitespace-pre-wrap text-sm">{error}</pre>
          </AlertDescription>
        </Alert>
      )}

      {data.length > 0 && (
        <div className="grid grid-rows-2 gap-4 h-full py-6">
          <DataTable
            data={data}
            selectedIndex={selectedCustomerIndex}
            onRowClick={handleCustomerSelect}
          />

          <TemplateEditor
            data={data}
            templates={templates}
            activeLanguage={activeLanguage}
            selectedCustomerIndex={selectedCustomerIndex}
            translating={translating}
            sending={sending}
            onTemplateChange={handleTemplateChange}
            onLanguageChange={setActiveLanguage}
            onTranslate={handleTranslate}
            onSendSms={handleSendSms}
          />
        </div>
      )}
    </div>
  );
}
