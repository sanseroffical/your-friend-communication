import { Twitter, Github, Heart, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

const SOCIAL_LINKS = [
  { name: 'Twitter', icon: Twitter, url: 'https://twitter.com', color: 'hover:text-blue-400' },
  { name: 'GitHub', icon: Github, url: 'https://github.com', color: 'hover:text-foreground' },
];

const SocialArea = () => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Heart className="h-4 w-4" />
          Social & Support
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-primary" />
            Connect & Support
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Follow Us</CardTitle>
              <CardDescription>Stay updated with the latest news</CardDescription>
            </CardHeader>
            <CardContent className="flex gap-2">
              {SOCIAL_LINKS.map((link) => (
                <Button
                  key={link.name}
                  variant="outline"
                  size="icon"
                  className={link.color}
                  onClick={() => window.open(link.url, '_blank')}
                >
                  <link.icon className="h-5 w-5" />
                </Button>
              ))}
            </CardContent>
          </Card>

          <Card className="border-primary/20 bg-primary/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Heart className="h-4 w-4 text-red-500" />
                Support the Developers
              </CardTitle>
              <CardDescription>
                Help us keep the servers running and add new features!
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

export default SocialArea;
