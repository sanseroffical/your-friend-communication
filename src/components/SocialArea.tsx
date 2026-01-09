import { Heart, ExternalLink, Coffee, Tv } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

const SupportArea = () => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Heart className="h-4 w-4" />
          Support Us
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-destructive" />
            Support the Developers
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Coffee className="h-4 w-4" />
                Help Keep Us Running
              </CardTitle>
              <CardDescription>
                Your support helps us keep the servers running and add new features!
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button 
                className="w-full gap-2" 
                onClick={() => window.open('https://ko-fi.com', '_blank')}
              >
                ☕ Buy us a Coffee
                <ExternalLink className="h-4 w-4" />
              </Button>
              <Button 
                variant="outline" 
                className="w-full gap-2"
                onClick={() => window.open('https://patreon.com', '_blank')}
              >
                🎨 Support on Patreon
                <ExternalLink className="h-4 w-4" />
              </Button>
              <Button 
                variant="secondary" 
                className="w-full gap-2"
                onClick={() => window.open('https://twitch.tv/megapodo', '_blank')}
              >
                <Tv className="h-4 w-4" />
                Sub to Twitch Channel
                <ExternalLink className="h-4 w-4" />
              </Button>
              <p className="text-xs text-muted-foreground text-center pt-2">
                Every contribution helps! Thank you for your support 💜
              </p>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SupportArea;
