import { X, CheckCircle, XCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface EndShoppingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
  onCancel: () => void;
  isCompleting: boolean;
  isCancelling: boolean;
}

export const EndShoppingDialog = ({
  open,
  onOpenChange,
  onComplete,
  onCancel,
  isCompleting,
  isCancelling,
}: EndShoppingDialogProps) => {
  const busy = isCompleting || isCancelling;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm [&>button]:hidden">
        <div className="flex items-center justify-between">
          <DialogHeader className="p-0">
            <DialogTitle>End Shopping</DialogTitle>
            <DialogDescription className="sr-only">Choose how to end this shopping session</DialogDescription>
          </DialogHeader>
          <button
            onClick={() => onOpenChange(false)}
            className="rounded-full p-1 hover:bg-accent transition-colors"
            disabled={busy}
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        <p className="text-sm text-muted-foreground">
          How would you like to end this shopping session?
        </p>

        <div className="flex flex-col gap-2 mt-2">
          <Button
            onClick={() => { onComplete(); onOpenChange(false); }}
            disabled={busy}
            className="justify-start h-auto py-3 px-4"
          >
            <CheckCircle className="h-5 w-5 mr-3 flex-shrink-0" />
            <div className="text-left">
              <div className="font-medium">
                {isCompleting ? 'Completing...' : 'Complete Shopping'}
              </div>
              <div className="text-xs font-normal opacity-80 mt-0.5">
                Save session and update product history
              </div>
            </div>
          </Button>

          <Button
            variant="outline"
            onClick={() => { onCancel(); onOpenChange(false); }}
            disabled={busy}
            className="justify-start h-auto py-3 px-4 border-destructive/30 text-destructive hover:text-destructive hover:bg-destructive/5"
          >
            <XCircle className="h-5 w-5 mr-3 flex-shrink-0" />
            <div className="text-left">
              <div className="font-medium">
                {isCancelling ? 'Cancelling...' : 'Cancel Shopping'}
              </div>
              <div className="text-xs font-normal opacity-80 mt-0.5">
                Discard session without saving
              </div>
            </div>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
