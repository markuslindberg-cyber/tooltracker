import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from 'lucide-react';

export default function DeleteConfirmationModal({
  isOpen,
  onClose,
  title,
  description,
  hasTools,
  onUnassignAndDelete,
  onDeleteOnly,
  onConfirmNoTools,
}) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <DialogTitle>{title}</DialogTitle>
          </div>
          <DialogDescription className="text-sm text-gray-600 mt-2">
            {description}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="flex flex-col gap-2 sm:flex-col mt-2">
          {hasTools ? (
            <>
              <Button
                onClick={onUnassignAndDelete}
                className="w-full bg-red-600 hover:bg-red-700 text-white"
              >
                Koppla bort alla verktyg och ta bort
              </Button>
              <Button
                variant="outline"
                onClick={onDeleteOnly}
                className="w-full"
              >
                Ta bort utan att koppla bort verktyg
              </Button>
            </>
          ) : (
            <Button
              onClick={onConfirmNoTools}
              className="w-full bg-red-600 hover:bg-red-700 text-white"
            >
              Ja, ta bort
            </Button>
          )}
          <Button variant="ghost" onClick={onClose} className="w-full">
            Avbryt
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}