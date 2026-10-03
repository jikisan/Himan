import { useRef, useState } from 'react';
import { ImagePlus, Loader2, Star, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button, Label } from '@/components/ui';
import { useAuth } from '@auth/presentation/hooks';
import { CompressionService } from '@storage/infrastructure';
import { ProjectMediaService } from '../../infrastructure';

const MAX_SCREENSHOTS = 6;
const media = new ProjectMediaService();

interface ProjectScreenshotsProps {
  value: string[];
  onChange: (paths: string[]) => void;
}

// Uploads on pick so the preview is the real stored file. Paths dropped
// here are deleted from storage only after the project saves (see
// ProjectSection), so cancelling an edit never breaks a live portfolio.
export const ProjectScreenshots = ({ value, onChange }: ProjectScreenshotsProps) => {
  const { user } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(0);
  const room = MAX_SCREENSHOTS - value.length;

  const handleFiles = async (files: FileList | null) => {
    if (!files || !user) return;
    const picked = [...files].slice(0, room);
    setUploading(picked.length);
    const added: string[] = [];
    for (const file of picked) {
      try {
        const compressed = await CompressionService.compress(file);
        const bytes = new Uint8Array(await compressed.arrayBuffer());
        added.push(await media.upload(user.id, bytes, compressed.type));
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to upload screenshot');
      } finally {
        setUploading((n) => n - 1);
      }
    }
    if (added.length) onChange([...value, ...added]);
    if (inputRef.current) inputRef.current.value = '';
  };

  const makeCover = (index: number) => onChange([value[index], ...value.filter((_, i) => i !== index)]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>Screenshots</Label>
        <span className="text-xs text-muted-foreground">
          {value.length}/{MAX_SCREENSHOTS} · first is the cover
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {value.map((path, index) => (
          <div key={path} className="group relative h-24 w-20 overflow-hidden rounded-md border border-border bg-muted">
            <img src={ProjectMediaService.publicUrl(path)} alt={`Screenshot ${index + 1}`} className="h-full w-full object-cover object-top" />
            {index === 0 && (
              <span className="absolute left-1 top-1 rounded bg-background/90 px-1 text-[10px] font-medium">Cover</span>
            )}
            <div className="absolute inset-x-0 bottom-0 flex justify-end gap-0.5 bg-gradient-to-t from-black/60 p-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
              {index > 0 && (
                <button
                  type="button"
                  title="Make cover"
                  onClick={() => makeCover(index)}
                  className="rounded bg-background/90 p-1 hover:bg-background"
                >
                  <Star className="h-3 w-3" />
                </button>
              )}
              <button
                type="button"
                title="Remove screenshot"
                onClick={() => onChange(value.filter((_, i) => i !== index))}
                className="rounded bg-background/90 p-1 hover:bg-background"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          </div>
        ))}
        {room > 0 && (
          <Button
            type="button"
            variant="outline"
            className="h-24 w-20 flex-col gap-1 text-xs"
            onClick={() => inputRef.current?.click()}
            disabled={uploading > 0}
          >
            {uploading > 0 ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
            {uploading > 0 ? 'Uploading' : 'Add'}
          </Button>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        Phone screens for mobile apps, full-page captures for websites and automations. WebP, JPEG or PNG.
      </p>
      <input
        ref={inputRef}
        type="file"
        accept={ProjectMediaService.acceptedTypes.join(',')}
        multiple
        hidden
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  );
};
