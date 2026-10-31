import { Badge, Card, CardContent } from '@ticketing/ui';
import { ImageDropzone } from '../../components/ImageDropzone';

interface VenuePreviewCardProps {
  file: File | null;
  onFileChange: (file: File | null) => void;
  initialImageUrl?: string | null;
  name: string;
  address: string;
  isShared: boolean;
}

export function VenuePreviewCard({
  file,
  onFileChange,
  initialImageUrl,
  name,
  address,
  isShared,
}: VenuePreviewCardProps) {
  return (
    <Card className="overflow-hidden py-0">
      <ImageDropzone
        file={file}
        onFileChange={onFileChange}
        initialImageUrl={initialImageUrl}
        aspectRatio="landscape"
      />
      <CardContent className="flex flex-col gap-1 py-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-semibold">{name || 'Your venue name'}</h3>
          <Badge variant={isShared ? 'success' : 'destructive'}>
            {isShared ? 'Shared' : 'Private'}
          </Badge>
        </div>
        <p className="text-muted-foreground text-sm">{address || 'Address'}</p>
      </CardContent>
    </Card>
  );
}
