import { AlertTriangle } from "lucide-react";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";

interface ErrorModalProps {
    message: string;
    onClose: () => void;
}

export function ErrorModal({ message, onClose }: ErrorModalProps) {
    return (
        <Dialog open={true} modal={true}>
            <DialogContent
                className="bg-white border-2 border-black relative overflow-hidden animate-fadeIn"
                style={{
                    boxShadow: "0 4px 20px rgba(0, 0, 0, 0.2)",
                    maxWidth: "28rem",
                }}
            >
                <div className="relative z-10">
                    <DialogHeader className="flex flex-row items-center gap-3 pb-2">
                        <div className="p-2 bg-black rounded-full">
                            <AlertTriangle className="h-7 w-7 text-white" />
                        </div>
                        <DialogTitle className="text-xl font-bold text-black">Connection Error</DialogTitle>
                    </DialogHeader>

                    <div className="mt-2 text-gray-700 bg-white p-4 rounded-md border border-gray-200">
                        <p>{message}</p>
                    </div>

                    <DialogFooter className="mt-6">
                        <Button
                            onClick={onClose}
                            type="button"
                            variant="default"
                            size="sm"
                            className="w-full sm:w-auto bg-black text-white hover:bg-gray-800"
                        >
                            KO
                        </Button>
                    </DialogFooter>
                </div>
            </DialogContent>
        </Dialog>
    );
}
