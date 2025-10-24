"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Papa from "papaparse";
import { X } from "lucide-react";
import Handlebars from "handlebars";
import { FileDropzone } from "~/components/FileDropzone";
import { csvRecordSchema, type CsvRecord } from "~/lib/schemas";
import { DataTable } from "~/components/DataTable";
import { sendSmsToAll, translateTemplate } from "./actions";
import { Textarea } from "~/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Button } from "~/components/ui/button";

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
    default:
      "Hello {{first_name}} {{last_name}},\n\nYour {{year}} {{make}} {{model}} (VIN: {{vin}}) has an open recall.\n\nRecall: {{recall_code}}\nDescription: {{recall_desc}}\n\nPlease contact us at {{phone}}.",
  });
  const [activeLanguage, setActiveLanguage] = useState("default");

  const handleReset = () => {
    setData([]);
    setError(null);
    setLoading(false);
    setSelectedCustomerIndex(0);
    setTemplates({
      default:
        "Hello {{first_name}} {{last_name}},\n\nYour {{year}} {{make}} {{model}} (VIN: {{vin}}) has an open recall.\n\nRecall: {{recall_code}}\nDescription: {{recall_desc}}\n\nPlease contact us at {{phone}}.",
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
    if (customer) {
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

  const getTemplatePreview = () => {
    if (data.length === 0)
      return { content: "No data loaded yet", hasError: false };

    try {
      const selectedCustomer = data[selectedCustomerIndex];
      const templateToPreview = templates[activeLanguage] ?? templates.default;

      if (!templateToPreview) {
        return {
          content: "No template available for this language",
          hasError: true,
        };
      }

      const compiledTemplate = Handlebars.compile(templateToPreview);
      const content = compiledTemplate(selectedCustomer);
      return { content, hasError: false, language: activeLanguage };
    } catch (err) {
      return {
        content: `Template error: ${err instanceof Error ? err.message : "Unknown error"}`,
        hasError: true,
      };
    }
  };

  const templatePreview = getTemplatePreview();
  const isTemplateValid = !templatePreview.hasError && data.length > 0;

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
        <div className="grid grid-rows-2 gap-4 h-full py-6">
          <DataTable
            data={data}
            selectedIndex={selectedCustomerIndex}
            onRowClick={handleCustomerSelect}
          />

          <div className="border rounded-md">
            <div className="grid grid-cols-2 gap-4 pt-2 pb-1 px-4">
              <div className="flex items-center gap-2">
                <label className="text-lg font-semibold">Template</label>
                <Button
                  onClick={handleTranslate}
                  disabled={translating || data.length === 0}
                  size="sm"
                  variant="outline"
                >
                  {translating ? "Translating..." : "Translate"}
                </Button>
                <span className="ml-2 text-sm text-gray-500">
                  Click any customer to preview
                </span>
              </div>

              <div className="flex items-center justify-between">
                <label className="text-lg font-semibold">Preview</label>
                <Button
                  onClick={handleSendSms}
                  disabled={sending || !isTemplateValid}
                  size="sm"
                >
                  {sending ? "Sending..." : "Send SMS to all"}
                </Button>
              </div>
            </div>

            <div className="px-4 pb-2">
              <Tabs value={activeLanguage} onValueChange={setActiveLanguage}>
                <TabsList>
                  {Object.keys(templates)
                    .sort((a, b) => (a === "default" ? -1 : b === "default" ? 1 : a.localeCompare(b)))
                    .map((lang) => (
                      <TabsTrigger key={lang} value={lang}>
                        {lang === "default" ? "Default" : lang.toUpperCase()}
                      </TabsTrigger>
                    ))}
                </TabsList>
              </Tabs>
            </div>

            <div className="overflow-auto grid grid-cols-2 gap-4 px-4 pt-1">
              <Textarea
                value={templates[activeLanguage] ?? ""}
                onChange={(e) =>
                  setTemplates((prev) => ({
                    ...prev,
                    [activeLanguage]: e.target.value,
                  }))
                }
                style={{ scrollbarWidth: "none" }}
              />
              <pre
                className={`whitespace-pre-wrap text-sm px-2 ${templatePreview.hasError ? "text-red-600" : ""}`}
              >
                {templatePreview.content}
              </pre>
            </div>
          </div>
        </div>
      )
      }
    </div >
  );
}
