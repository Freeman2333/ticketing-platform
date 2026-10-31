import { Card, CardContent, formatDateTime } from '@ticketing/ui';
import { ImageDropzone } from '../../components/ImageDropzone';

export function EventPreviewCard({
  file,
  onFileChange,
  title,
  venueName,
  startsAt,
}: {
  file: File | null;
  onFileChange: (file: File | null) => void;
  title: string;
  venueName: string | undefined;
  startsAt: Date | undefined;
}) {
  return (
    <Card className="overflow-hidden py-0">
      <ImageDropzone
        file={file}
        onFileChange={onFileChange}
        aspectRatio="video"
      />
      <CardContent className="flex flex-col gap-1 py-4">
        <h3 className="font-semibold">{title || 'Your event title'}</h3>
        <p className="text-muted-foreground text-sm">
          {startsAt ? formatDateTime(startsAt, 'medium') : 'Pick a date'}
        </p>
        <p className="text-muted-foreground text-sm">
          {venueName ?? 'Select a venue'}
        </p>
      </CardContent>
    </Card>
  );
}
