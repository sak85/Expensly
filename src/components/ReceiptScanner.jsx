import { useState, useRef } from "react";
import { Camera, Upload, ScanLine } from "lucide-react";
import { createWorker } from "tesseract.js";
import { toast } from "sonner";
import { fileToDataUrl } from "@/lib/file-utils";
import { parseReceiptText } from "@/lib/receipt-parser";

export default function ReceiptScanner({ onScanComplete }) {
  const [isScanning, setIsScanning] = useState(false);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const processReceipt = async (file) => {
    setIsScanning(true);
    try {
      const dataUrl = await fileToDataUrl(file);
      const worker = await createWorker("eng");
      const result = await worker.recognize(file);
      await worker.terminate();

      const extracted = parseReceiptText(result.data.text ?? "");
      onScanComplete({ ...extracted, receipt_url: dataUrl });
      toast.success("Receipt scanned successfully!");
    } catch (err) {
      toast.error("Failed to scan receipt. Please try again.");
      throw err;
    } finally {
      setIsScanning(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) processReceipt(file);
    e.target.value = "";
  };

  return (
    <div className="space-y-3">
      {isScanning ? (
        <div className="flex flex-col items-center justify-center py-12 rounded-2xl border-2 border-dashed border-primary/30 bg-accent/50">
          <div className="relative">
            <ScanLine className="w-10 h-10 text-primary animate-pulse" />
          </div>
          <p className="mt-4 text-sm font-medium text-primary">Scanning receipt...</p>
          <p className="text-xs text-muted-foreground mt-1">Extracting details with AI</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => cameraInputRef.current?.click()}
            className="flex flex-col items-center gap-3 p-6 rounded-2xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-accent/50 transition-all group"
          >
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
              <Camera className="w-6 h-6 text-primary" />
            </div>
            <span className="text-sm font-medium">Take Photo</span>
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center gap-3 p-6 rounded-2xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-accent/50 transition-all group"
          >
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
              <Upload className="w-6 h-6 text-primary" />
            </div>
            <span className="text-sm font-medium">Upload File</span>
          </button>
        </div>
      )}

      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.pdf"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}