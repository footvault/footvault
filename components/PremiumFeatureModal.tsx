import React from "react";
import Link from "next/link";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "./ui/dialog";
import { Button } from "./ui/button";
import { Star } from "lucide-react";

interface PremiumFeatureModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  featureName?: string;
}

export default function PremiumFeatureModal({ open, onOpenChange, featureName }: PremiumFeatureModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm w-full">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Star className="text-yellow-500 h-6 w-6" />
            <DialogTitle>Premium Feature</DialogTitle>
          </div>
        </DialogHeader>
        <DialogDescription>
          {featureName ? (
            <span>
              <b>{featureName}</b> is only available on paid plans.<br />
            </span>
          ) : null}
          This feature is not available for free users.
        </DialogDescription>
        <DialogFooter>
          <Link href="/subscription" passHref legacyBehavior>
            <Button asChild className="w-full">
              <a>Go to Subscription</a>
            </Button>
          </Link>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
