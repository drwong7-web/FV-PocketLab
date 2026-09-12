import { useRef, type ChangeEvent } from "react";
import { ImagePlus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { fileToJpegDataUrl, isImagePickError } from "@/lib/imagePick";
import { useSettings } from "@/lib/settings";
import { cn } from "@/lib/utils";

interface Props {
  value?: string;
  onChange: (dataUrl: string | undefined) => void;
  label: string;
  fallback?: string;
  shape?: "square" | "circle";
  size?: "sm" | "md" | "lg";
}

const SIZE = {
  sm: "h-12 w-12 text-sm",
  md: "h-16 w-16 text-base",
  lg: "h-20 w-20 text-xl",
};

export function ImagePicker({
  value,
  onChange,
  label,
  fallback,
  shape = "square",
  size = "md",
}: Props) {
  const { t } = useSettings();
  const inputRef = useRef<HTMLInputElement>(null);

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      onChange(await fileToJpegDataUrl(file));
    } catch (err) {
      if (isImagePickError(err) && err.code === "too-large") toast.error(t("imageTooLarge"));
      else if (isImagePickError(err) && err.code === "not-image") toast.error(t("imageNotImage"));
      else toast.error(t("imagePickFailed"));
    }
  };

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className={cn(
          "shrink-0 overflow-hidden border border-border/70 bg-secondary/50 flex items-center justify-center",
          shape === "circle" ? "rounded-full" : "rounded-2xl",
          SIZE[size]
        )}
        aria-label={label}
      >
        {value ? (
          <img src={value} alt="" className="h-full w-full object-cover" />
        ) : fallback ? (
          <span className="font-bold text-primary-foreground bg-gradient-primary h-full w-full flex items-center justify-center">
            {fallback}
          </span>
        ) : (
          <ImagePlus className="h-5 w-5 text-muted-foreground" />
        )}
      </button>
      <div className="min-w-0 flex-1 space-y-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
            {value ? t("imageChange") : t("imageChoose")}
          </Button>
          {value && (
            <Button type="button" variant="ghost" size="sm" onClick={() => onChange(undefined)}>
              <Trash2 className="h-3.5 w-3.5" />
              {t("imageRemove")}
            </Button>
          )}
        </div>
      </div>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
    </div>
  );
}
