import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { TierType } from '../../domain';
import { TierBadge } from './TierBadge';

interface UpgradeDialogProps {
  open: boolean;
  onClose: () => void;
  currentTier: TierType;
  reason?: string;
  feature?: string;
}

export const UpgradeDialog = ({
  open,
  onClose,
  currentTier,
  reason,
  feature = 'this feature',
}: UpgradeDialogProps) => {
  const getMessage = () => {
    if (currentTier === 'beta') {
      return `As a beta tester, you've reached the limit for ${feature}. Thank you for helping us improve! Please contact us if you need more capacity.`;
    }
    return reason || `Upgrade to access ${feature}.`;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Upgrade Required
            <TierBadge tier={currentTier} />
          </DialogTitle>
          <DialogDescription className="pt-2">{getMessage()}</DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="space-y-3">
            <div className="rounded-lg border border-border bg-muted/30 p-4">
              <h4 className="font-medium text-sm mb-2">Available Tiers</h4>
              <div className="space-y-2 text-sm text-muted-foreground">
                {currentTier === 'free' && (
                  <>
                    <div className="flex items-center justify-between">
                      <span>Beta (Limited)</span>
                      <TierBadge tier="beta" />
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Pro (Unlimited)</span>
                      <TierBadge tier="pro" />
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Enterprise (Unlimited)</span>
                      <TierBadge tier="enterprise" />
                    </div>
                  </>
                )}
                {currentTier === 'beta' && (
                  <>
                    <div className="flex items-center justify-between">
                      <span>Pro (Unlimited)</span>
                      <TierBadge tier="pro" />
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Enterprise (Unlimited)</span>
                      <TierBadge tier="enterprise" />
                    </div>
                  </>
                )}
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Contact your administrator to upgrade your account tier.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={onClose} variant="outline">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
