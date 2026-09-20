import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getMethodNote } from "@/lib/methodNote";
import { useSettings } from "@/lib/settings";
import { cn } from "@/lib/utils";

export function MethodNoteDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { lang } = useSettings();
  const note = getMethodNote(lang);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-3xl max-h-[85vh] overflow-hidden p-0 gap-0 border-border/60 bg-gradient-to-br from-primary/10 to-background"
        dir={note.rtl ? "rtl" : "ltr"}
      >
        <div className="overflow-y-auto max-h-[85vh] p-6 sm:p-10">
          <DialogHeader className={cn("space-y-2", note.rtl ? "text-end sm:text-end" : "text-start sm:text-start")}>
            <DialogTitle className="font-display text-2xl sm:text-3xl tracking-tight leading-tight">
              {note.title}
            </DialogTitle>
            <DialogDescription className="text-sm sm:text-base">{note.kicker}</DialogDescription>
          </DialogHeader>

          <div
            className={cn(
              "mt-6 space-y-3 text-sm sm:text-base text-muted-foreground leading-relaxed",
              note.rtl && "text-end",
            )}
          >
            {note.blocks.map((block, i) => {
              if (block.type === "h2") {
                return (
                  <h3 key={i} className="font-display text-lg text-foreground pt-3">
                    {block.text}
                  </h3>
                );
              }
              if (block.type === "ul") {
                return (
                  <ul key={i} className={cn("space-y-1 ms-5 list-disc", note.rtl && "ms-0 me-5")}>
                    {block.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                );
              }
              if (block.type === "note") {
                return (
                  <p key={i} className="text-xs sm:text-sm italic">
                    {block.text}
                  </p>
                );
              }
              return <p key={i}>{block.text}</p>;
            })}
          </div>

          <p className={cn("mt-8 text-xs text-muted-foreground", note.rtl && "text-end")}>{note.disclaimer}</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
