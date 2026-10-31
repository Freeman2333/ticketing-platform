import { useEffect, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { ImageIcon } from 'lucide-react';

const ASPECT_RATIO_CLASSES = {
  portrait: 'aspect-3/4',
  landscape: 'aspect-4/3',
  video: 'aspect-video',
} as const;

export function ImageDropzone({
  file,
  onFileChange,
  initialImageUrl = null,
  aspectRatio = 'portrait',
}: {
  file: File | null;
  onFileChange: (file: File | null) => void;
  initialImageUrl?: string | null;
  aspectRatio?: keyof typeof ASPECT_RATIO_CLASSES;
}) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(initialImageUrl);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(initialImageUrl);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file, initialImageUrl]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'image/*': [] },
    multiple: false,
    onDrop: (acceptedFiles) => onFileChange(acceptedFiles[0] ?? null),
  });

  return (
    <div
      {...getRootProps()}
      className={`group relative ${ASPECT_RATIO_CLASSES[aspectRatio]} w-full cursor-pointer overflow-hidden rounded-md border-2 border-dashed transition-colors ${
        isDragActive ? 'border-primary bg-accent' : 'border-input'
      }`}
    >
      <input {...getInputProps()} />
      {previewUrl ? (
        <>
          <img
            src={previewUrl}
            alt="Preview"
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/0 text-sm font-medium text-white opacity-0 transition-opacity group-hover:bg-black/40 group-hover:opacity-100">
            Change image
          </div>
        </>
      ) : (
        <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
          <ImageIcon className="text-muted-foreground size-6" />
          <span className="text-muted-foreground text-sm">
            Click or drag an image here
          </span>
        </div>
      )}
    </div>
  );
}
