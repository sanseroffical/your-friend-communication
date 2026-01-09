import { useState, useRef, useCallback, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ZoomIn, ZoomOut, RotateCw, Check, X, Sun, Contrast, Droplets } from 'lucide-react';
import { Label } from '@/components/ui/label';

interface ImageEditorProps {
  isOpen: boolean;
  onClose: () => void;
  imageFile: File;
  onSave: (croppedBlob: Blob) => void;
}

interface Filters {
  brightness: number;
  contrast: number;
  saturation: number;
}

interface Preset {
  id: string;
  name: string;
  filters: Filters;
}

const FILTER_PRESETS: Preset[] = [
  { id: 'normal', name: 'Normal', filters: { brightness: 100, contrast: 100, saturation: 100 } },
  { id: 'sepia', name: 'Sepia', filters: { brightness: 95, contrast: 85, saturation: 30 } },
  { id: 'grayscale', name: 'B&W', filters: { brightness: 100, contrast: 110, saturation: 0 } },
  { id: 'vintage', name: 'Vintage', filters: { brightness: 90, contrast: 85, saturation: 70 } },
  { id: 'vivid', name: 'Vivid', filters: { brightness: 105, contrast: 120, saturation: 140 } },
  { id: 'warm', name: 'Warm', filters: { brightness: 105, contrast: 95, saturation: 110 } },
  { id: 'cool', name: 'Cool', filters: { brightness: 100, contrast: 105, saturation: 90 } },
  { id: 'dramatic', name: 'Dramatic', filters: { brightness: 90, contrast: 140, saturation: 80 } },
];

const ImageEditor = ({ isOpen, onClose, imageFile, onSave }: ImageEditorProps) => {
  const [imageSrc, setImageSrc] = useState<string>('');
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [filters, setFilters] = useState<Filters>({ brightness: 100, contrast: 100, saturation: 100 });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    if (imageFile) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImageSrc(e.target?.result as string);
      };
      reader.readAsDataURL(imageFile);
    }
  }, [imageFile]);

  useEffect(() => {
    if (imageSrc) {
      const img = new Image();
      img.onload = () => {
        imageRef.current = img;
        drawCanvas();
      };
      img.src = imageSrc;
    }
  }, [imageSrc]);

  useEffect(() => {
    drawCanvas();
  }, [zoom, rotation, position, filters]);

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = 400;
    canvas.width = size;
    canvas.height = size;

    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, size, size);

    // Apply filters
    ctx.filter = `brightness(${filters.brightness}%) contrast(${filters.contrast}%) saturate(${filters.saturation}%)`;

    ctx.save();
    ctx.translate(size / 2 + position.x, size / 2 + position.y);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(zoom, zoom);

    const aspectRatio = img.width / img.height;
    let drawWidth, drawHeight;
    
    if (aspectRatio > 1) {
      drawHeight = size;
      drawWidth = size * aspectRatio;
    } else {
      drawWidth = size;
      drawHeight = size / aspectRatio;
    }

    ctx.drawImage(img, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
    ctx.restore();
    
    // Reset filter for next draw
    ctx.filter = 'none';
  }, [zoom, rotation, position, filters]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const resetFilters = () => {
    setFilters({ brightness: 100, contrast: 100, saturation: 100 });
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.toBlob((blob) => {
      if (blob) {
        onSave(blob);
        handleClose();
      }
    }, 'image/jpeg', 0.9);
  };

  const handleClose = () => {
    setZoom(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
    setFilters({ brightness: 100, contrast: 100, saturation: 100 });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Image</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4">
          <div 
            className="relative overflow-hidden rounded-lg border border-border cursor-move bg-muted"
            style={{ width: 400, height: 400, maxWidth: '100%' }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            <canvas ref={canvasRef} className="w-full h-full" />
          </div>

          <Tabs defaultValue="presets" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="presets">Presets</TabsTrigger>
              <TabsTrigger value="transform">Transform</TabsTrigger>
              <TabsTrigger value="adjust">Adjust</TabsTrigger>
            </TabsList>

            <TabsContent value="presets" className="mt-4">
              <div className="grid grid-cols-4 gap-2">
                {FILTER_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => setFilters(preset.filters)}
                    className={`p-2 rounded-lg border text-xs font-medium transition-all ${
                      filters.brightness === preset.filters.brightness &&
                      filters.contrast === preset.filters.contrast &&
                      filters.saturation === preset.filters.saturation
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="transform" className="space-y-4 mt-4">
              <div className="flex items-center gap-4">
                <ZoomOut className="h-4 w-4 text-muted-foreground" />
                <Slider
                  value={[zoom]}
                  min={0.5}
                  max={3}
                  step={0.1}
                  onValueChange={([value]) => setZoom(value)}
                  className="flex-1"
                />
                <ZoomIn className="h-4 w-4 text-muted-foreground" />
              </div>

              <div className="flex justify-center">
                <Button variant="outline" size="sm" onClick={handleRotate} className="gap-2">
                  <RotateCw className="h-4 w-4" />
                  Rotate 90°
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="adjust" className="space-y-4 mt-4">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Sun className="h-4 w-4 text-muted-foreground" />
                  <Label className="w-20">Brightness</Label>
                  <Slider
                    value={[filters.brightness]}
                    min={50}
                    max={150}
                    step={1}
                    onValueChange={([value]) => setFilters(f => ({ ...f, brightness: value }))}
                    className="flex-1"
                  />
                  <span className="text-sm text-muted-foreground w-12 text-right">{filters.brightness}%</span>
                </div>

                <div className="flex items-center gap-3">
                  <Contrast className="h-4 w-4 text-muted-foreground" />
                  <Label className="w-20">Contrast</Label>
                  <Slider
                    value={[filters.contrast]}
                    min={50}
                    max={150}
                    step={1}
                    onValueChange={([value]) => setFilters(f => ({ ...f, contrast: value }))}
                    className="flex-1"
                  />
                  <span className="text-sm text-muted-foreground w-12 text-right">{filters.contrast}%</span>
                </div>

                <div className="flex items-center gap-3">
                  <Droplets className="h-4 w-4 text-muted-foreground" />
                  <Label className="w-20">Saturation</Label>
                  <Slider
                    value={[filters.saturation]}
                    min={0}
                    max={200}
                    step={1}
                    onValueChange={([value]) => setFilters(f => ({ ...f, saturation: value }))}
                    className="flex-1"
                  />
                  <span className="text-sm text-muted-foreground w-12 text-right">{filters.saturation}%</span>
                </div>

                <Button variant="outline" size="sm" onClick={resetFilters} className="w-full mt-2">
                  Reset Filters
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} className="gap-2">
            <X className="h-4 w-4" />
            Cancel
          </Button>
          <Button onClick={handleSave} className="gap-2">
            <Check className="h-4 w-4" />
            Apply
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ImageEditor;