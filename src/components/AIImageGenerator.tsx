import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, ImagePlus, Download, X, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AIImageGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertImage?: (imageUrl: string) => void;
}

const AIImageGenerator = ({ isOpen, onClose, onInsertImage }: AIImageGeneratorProps) => {
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const { toast } = useToast();

  const generateImage = async () => {
    if (!prompt.trim() || isGenerating) return;
    setIsGenerating(true);

    try {
      const { data, error } = await supabase.functions.invoke("ai-features", {
        body: { action: "generate_image", prompt: prompt.trim() },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.imageUrl) {
        setGeneratedImages(prev => [data.imageUrl, ...prev]);
        toast({ title: "Image generated! ✨" });
      }
    } catch (err: any) {
      toast({ title: "Generation failed", description: err.message, variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between py-3 px-4">
        <CardTitle className="text-base flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          AI Image Generator
        </CardTitle>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="p-4 pt-0 space-y-3">
        <div className="flex gap-2">
          <Input
            placeholder="Describe the image you want..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && generateImage()}
            disabled={isGenerating}
            className="text-sm"
          />
          <Button onClick={generateImage} disabled={isGenerating || !prompt.trim()} size="icon">
            {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
          </Button>
        </div>

        <ScrollArea className="h-48">
          {generatedImages.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">
              Describe something and I'll create it! 🎨
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {generatedImages.map((url, i) => (
                <div key={i} className="relative group rounded-lg overflow-hidden border">
                  <img src={url} alt={`Generated ${i}`} className="w-full h-24 object-cover" />
                  <div className="absolute inset-0 bg-background/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                    {onInsertImage && (
                      <Button size="sm" variant="secondary" className="h-7 text-xs" onClick={() => onInsertImage(url)}>
                        Use
                      </Button>
                    )}
                    <a href={url} download target="_blank" rel="noreferrer">
                      <Button size="icon" variant="secondary" className="h-7 w-7">
                        <Download className="h-3 w-3" />
                      </Button>
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default AIImageGenerator;
