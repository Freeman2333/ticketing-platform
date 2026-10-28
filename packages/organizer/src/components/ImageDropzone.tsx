import { useEffect, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { ImageIcon } from 'lucide-react';

export function ImageDropzone({
  file,
  onFileChange,
}: {
  file: File | null;
  onFileChange: (file: File | null) => void;
}) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'image/*': [] },
    multiple: false,
    onDrop: (acceptedFiles) => onFileChange(acceptedFiles[0] ?? null),
  });

  return (
    <div
      {...getRootProps()}
      className={`flex h-full min-h-48 cursor-pointer flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed p-6 text-center transition-colors ${
        isDragActive ? 'border-primary bg-accent' : 'border-input'
      }`}
    >
      <input {...getInputProps()} />
      {previewUrl ? (
        <img
          src={previewUrl}
          alt="Preview"
          className="h-32 w-full rounded-md object-cover"
        />
      ) : (
        <>
          <ImageIcon className="text-muted-foreground size-6" />
          <span className="text-muted-foreground text-sm">
            Click or drag an image here
          </span>
        </>
      )}
    </div>
  );
}
