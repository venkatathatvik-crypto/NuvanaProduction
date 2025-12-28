import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface SessionExpiredModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SessionExpiredModal = ({ isOpen, onClose }: SessionExpiredModalProps) => {
  const navigate = useNavigate();

  const handleLoginRedirect = () => {
    onClose();
    navigate("/login");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-destructive" />
            </div>
            <DialogTitle className="text-xl">Session Expired</DialogTitle>
          </div>
          <DialogDescription className="text-base pt-2">
            Your session has expired for security reasons. Please log in again to continue.
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-end gap-3 mt-4">
          <Button onClick={handleLoginRedirect} className="w-full sm:w-auto">
            Login Again
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
