import React, { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface SensitiveActionDialogProps {
  children?: React.ReactNode;
  onConfirm: () => void;
  title: string;
  description: React.ReactNode;
  requireConfirmationText?: string;
  actionText?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const SensitiveActionDialog = ({
  children,
  onConfirm,
  title,
  description,
  requireConfirmationText,
  actionText = "Confirmer",
  open,
  onOpenChange
}: SensitiveActionDialogProps) => {
  const [confirmationInput, setConfirmationInput] = useState("");

  const isConfirmed = requireConfirmationText
    ? confirmationInput === requireConfirmationText
    : true;

  const handleConfirm = () => {
    if (isConfirmed) {
      onConfirm();
      if (onOpenChange) onOpenChange(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      {children && (
        <AlertDialogTrigger asChild>
          {children}
        </AlertDialogTrigger>
      )}
      <AlertDialogContent className="bg-slate-900 border-slate-800">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-xl font-bold">{title}</AlertDialogTitle>
          <AlertDialogDescription className="text-slate-400">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        {requireConfirmationText && (
          <div className="my-4 space-y-2">
            <Label htmlFor="confirmation" className="text-sm text-slate-300">
              Veuillez taper <strong>{requireConfirmationText}</strong> pour confirmer.
            </Label>
            <Input
              id="confirmation"
              value={confirmationInput}
              onChange={(e) => setConfirmationInput(e.target.value)}
              className="bg-slate-800 border-slate-700 text-white"
              placeholder={requireConfirmationText}
            />
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel className="bg-slate-800 text-white hover:bg-slate-700 border-slate-700">
            Annuler
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={!isConfirmed}
            className="bg-red-600 text-white hover:bg-red-700 focus:ring-red-500"
          >
            {actionText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
