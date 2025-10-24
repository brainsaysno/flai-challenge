import Handlebars from "handlebars";
import { Button } from "~/components/ui/button";
import { Textarea } from "~/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "~/components/ui/tabs";
import type { CsvRecord } from "~/lib/schemas";

interface TemplateEditorProps {
  data: CsvRecord[];
  templates: Record<string, string>;
  activeLanguage: string;
  selectedCustomerIndex: number;
  translating: boolean;
  sending: boolean;
  onTemplateChange: (language: string, value: string) => void;
  onLanguageChange: (language: string) => void;
  onTranslate: () => void;
  onSendSms: () => void;
}

export function TemplateEditor({
  data,
  templates,
  activeLanguage,
  selectedCustomerIndex,
  translating,
  sending,
  onTemplateChange,
  onLanguageChange,
  onTranslate,
  onSendSms,
}: TemplateEditorProps) {
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

  return (
    <div className="border rounded-md flex flex-col h-full">
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between pt-2 pb-1 px-4">
          <div className="flex items-center gap-2">
            <label className="text-lg font-semibold">Template</label>
            <Button
              onClick={onTranslate}
              disabled={translating || data.length === 0}
              size="sm"
              variant="outline"
            >
              {translating ? "Translating..." : "Translate"}
            </Button>
            <span className="ml-2 text-sm text-muted-foreground">
              Click any customer to preview
            </span>
          </div>
        </div>

        {Object.keys(templates).length > 1 && (
          <div className="px-4 pb-2">
            <Tabs value={activeLanguage} onValueChange={onLanguageChange}>
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
        )}

        <div className="overflow-auto px-4 pt-1 pb-4 flex-1">
          <Textarea
            value={templates[activeLanguage] ?? ""}
            onChange={(e) => onTemplateChange(activeLanguage, e.target.value)}
            className="h-full min-h-[150px]"
            style={{ scrollbarWidth: "none" }}
          />
        </div>
      </div>

      <div className="flex-1 flex flex-col border-t overflow-hidden">
        <div className="flex items-center justify-between pt-2 pb-1 px-4">
          <label className="text-lg font-semibold">Preview</label>
          <Button
            onClick={onSendSms}
            disabled={sending || !isTemplateValid}
            size="sm"
          >
            {sending ? "Sending..." : "Send SMS to all"}
          </Button>
        </div>
        <div className="overflow-auto px-4 pt-1 pb-4 flex-1">
          <pre
            className={`whitespace-pre-wrap text-sm px-2 ${templatePreview.hasError ? "text-destructive" : ""}`}
          >
            {templatePreview.content}
          </pre>
        </div>
      </div>
    </div>
  );
}
