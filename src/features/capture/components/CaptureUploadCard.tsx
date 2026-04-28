import { useRef, useState } from "react";
import { Camera, Upload, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { GuideStep } from "@/types/photobrief";

interface CaptureUploadCardProps {
  step: GuideStep;
  pending: boolean;
  onCapture: (previewUrl: string) => void;
  onSkip?: () => void;
}

const PLACEHOLDER_IMAGES = [
  "https://images.unsplash.com/photo-1581090464777-f3220bbe1b8b?w=600&q=70",
  "https://images.unsplash.com/photo-1487058792275-0ad4aaf24ca7?w=600&q=70",
  "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=600&q=70",
  "https://images.unsplash.com/photo-1531297484001-80022131f5a1?w=600&q=70",
];

/**
 * Camera/Upload card. Phase 2 uses a real <input capture> for mobile camera
 * and falls back to a placeholder image when the user clicks Simulate.
 * The same component will back the real capture flow in later phases.
 */
export function CaptureUploadCard({ step, pending, onCapture, onSkip }: CaptureUploadCardProps) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const uploadRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const url = String(reader.result);
      onCapture(url);
    };
    reader.readAsDataURL(file);
  };

  const handleSimulate = () => {
    setBusy(true);
    const url =
      PLACEHOLDER_IMAGES[Math.floor(Math.random() * PLACEHOLDER_IMAGES.length)];
    setTimeout(() => {
      setBusy(false);
      onCapture(url);
    }, 200);
  };

  const disabled = pending || busy;

  return (
    <div className="rounded-2xl border-2 border-dashed bg-card p-5 text-center">
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent text-accent-foreground">
        {pending ? (
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
        ) : (
          <Camera className="h-5 w-5" aria-hidden />
        )}
      </span>
      <p className="mt-3 text-sm font-medium text-foreground">
        {pending ? "Checking your photo…" : "Take or upload a photo"}
      </p>
      <p className="mt-0.5 text-xs text-muted-foreground">{step.title}</p>

      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
      />
      <input
        ref={uploadRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
      />

      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
        <Button
          size="sm"
          className="gap-1.5"
          disabled={disabled}
          onClick={() => cameraRef.current?.click()}
        >
          <Camera className="h-4 w-4" /> Take photo
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          disabled={disabled}
          onClick={() => uploadRef.current?.click()}
        >
          <Upload className="h-4 w-4" /> Upload
        </Button>
        <Button
          variant="ghost"
          size="sm"
          disabled={disabled}
          onClick={handleSimulate}
        >
          Simulate
        </Button>
      </div>

      {!step.required && onSkip && (
        <button
          type="button"
          onClick={onSkip}
          className="mt-3 text-xs text-muted-foreground underline-offset-2 hover:underline"
          disabled={disabled}
        >
          Skip this one
        </button>
      )}
    </div>
  );
}
