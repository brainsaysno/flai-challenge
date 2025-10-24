import { type RefObject } from "react";
import { FileDropzone } from "~/components/FileDropzone";
import { Alert, AlertDescription } from "~/components/ui/alert";

interface FileUploadSectionProps {
  fileInputRef: RefObject<HTMLInputElement | null>;
  loading: boolean;
  error: string | null;
  onBoxClick: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onFileSelect: (files: FileList | null) => void;
}

export function FileUploadSection({
  fileInputRef,
  loading,
  error,
  onBoxClick,
  onDragOver,
  onDrop,
  onFileSelect,
}: FileUploadSectionProps) {
  return (
    <>
      <FileDropzone
        fileInputRef={fileInputRef}
        handleBoxClick={onBoxClick}
        handleDragOver={onDragOver}
        handleDrop={onDrop}
        handleFileSelect={onFileSelect}
      />

      {loading && (
        <div className="mt-4 text-center text-muted-foreground">
          Loading and validating CSV...
        </div>
      )}

      {error && (
        <Alert variant="destructive" className="mt-4">
          <AlertDescription>
            <pre className="whitespace-pre-wrap text-sm">{error}</pre>
          </AlertDescription>
        </Alert>
      )}
    </>
  );
}
