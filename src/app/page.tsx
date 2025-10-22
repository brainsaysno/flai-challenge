import { FileDropzone } from "~/components/FileDropzone";

export default function HomePage() {
  return (
    <FileDropzone
      fileInputRef={fileInputRef}
      handleBoxClick={handleBoxClick}
      handleDragOver={handleDragOver}
      handleDrop={handleDrop}
      handleFileSelect={handleFileSelect}
    />
  );
}
