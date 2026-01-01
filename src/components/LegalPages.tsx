import { useState } from 'react';
import { FileText, Shield, ScrollText, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

const TOS_CONTENT = `
# Terms of Service
## (The Fun Legal Stuff Nobody Reads)

**Last Updated:** When we felt like it

### 1. ACCEPTANCE OF TERMS
By using FriendChat, you agree that:
- You have at least 3 brain cells (we're not picky)
- You promise not to be a complete dingus
- You acknowledge that we're doing our best here, okay?

### 2. THE BASICS
- **Don't be evil.** Google abandoned this motto, but we haven't.
- **No spam.** We've seen enough "Hey hun! 💕" messages to last a lifetime.
- **Be nice.** Your mom would be disappointed if you weren't.

### 3. WHAT YOU CAN DO
- ✅ Chat with friends (shocking, we know)
- ✅ Send memes (quality memes only please)
- ✅ Use emojis (even the eggplant 🍆)
- ✅ Have actual conversations (remember those?)

### 4. WHAT YOU CAN'T DO
- ❌ Hack us (please we're begging you)
- ❌ Send viruses (Bonzi Buddy is the only malware allowed here)
- ❌ Be mean to others (we have moderators and they have ban hammers)
- ❌ Pretend to be someone else (identity theft is not a joke, Jim)
- ❌ Share illegal content (we're not that kind of chat app)

### 5. BONZI BUDDY CLAUSE
If you enable Bonzi Buddy, you accept that:
- He may send messages as you
- He may cause chaos
- He's been alone since 1999 and just wants attention
- Any embarrassing messages sent are YOUR responsibility
- No refunds on dignity

### 6. LIABILITY
We're not responsible for:
- Broken friendships due to chat arguments
- Embarrassing messages sent at 3 AM
- Your boss finding out you're chatting at work
- Bonzi Buddy's shenanigans
- Lost time scrolling through messages
- Any damages to relationships caused by leaving on read

### 7. UPTIME GUARANTEE
We guarantee 99.9% uptime*
*Just kidding, we guarantee nothing. Sometimes the server is held together by hopes and dreams.

### 8. DATA STORAGE
Your messages are stored on our servers, which we found behind a Denny's. 
Just kidding - we use actual enterprise-grade infrastructure. Probably.

### 9. TERMINATION
We can terminate your account if you:
- Violate these terms
- Are really annoying
- Keep asking "u up?"
- Spam the same message 47 times
- Try to sell crypto

### 10. FINAL CLAUSE
By reading this far, you're legally obligated to have a good day.
This is now a binding contract. Smile. 😊

**Remember: Be excellent to each other! 🎸**
`;

const PRIVACY_CONTENT = `
# Privacy Policy
## (What We Do With Your Stuff)

**Effective Date:** The moment you started worrying about it

### 1. WHAT WE COLLECT

**The Obvious Stuff:**
- Your username (because "User #847362" is boring)
- Your email (for password resets and definitely not for spam)
- Your messages (that's... that's the whole point of a chat app)
- Your avatar (we judge, but silently)

**The Less Obvious Stuff:**
- When you were last online (for that sweet "last seen" feature)
- Your device info (to make sure you're not 47 robots in a trench coat)
- Room codes you've joined (we're keeping tabs 👀)

### 2. WHAT WE DON'T COLLECT

- Your deepest darkest secrets (unless you type them in chat)
- Your location (we don't want to know where you are)
- Your browser history (that's between you and your therapist)
- Your feelings (we're not licensed for that)

### 3. HOW WE USE YOUR DATA

**We will:**
- Show your messages to people in the same room (duh)
- Store your settings so they persist (you're welcome)
- Keep the app running (our primary goal, honestly)

**We won't:**
- Sell your data to advertisers (we're broke, not evil)
- Read your messages for fun (we have our own drama)
- Share your info with that guy named "Definitely Legit Data Broker LLC"
- Train AI on your conversations (we've seen enough)

### 4. SECURITY MEASURES

Your data is protected by:
- ✅ Encryption (the fancy math kind)
- ✅ Secure servers (with actual locks on the door)
- ✅ Our developer who took a cybersecurity course once
- ✅ A very angry cat who guards the server room
- ✅ Hope and prayers

### 5. COOKIES

We use cookies, but not the delicious kind. 🍪
Our cookies help us:
- Keep you logged in
- Remember your preferences
- Feel like real developers

### 6. THIRD PARTIES

We work with some third parties:
- **Supabase:** Stores your data (they're cool, we trust them)
- **WebRTC:** For video calls (so you can see your friends' faces)

We don't share your data with:
- The government (unless legally required)
- Your ex
- Hackers (but they keep trying)
- That one uncle who's "really into crypto"

### 7. DATA RETENTION

We keep your data until:
- You delete your account
- The heat death of the universe
- Whichever comes first

### 8. YOUR RIGHTS

You have the right to:
- Access your data (just ask nicely)
- Delete your account (we'll miss you 😢)
- Export your messages (for scrapbooking purposes)
- Complain about this privacy policy (we're ready)

### 9. CHILDREN

This app is not intended for children under 13.
If you're under 13, please go do homework or something.

### 10. CHANGES TO THIS POLICY

We may update this policy when:
- Laws change
- We get bored
- Mercury is in retrograde

### 11. CONTACT US

If you have privacy concerns, you can:
- Send us an email
- Yell into the void
- Send a carrier pigeon
- Use smoke signals

**Remember: We respect your privacy almost as much as we respect good memes.**

### 12. THE REAL TALK

Honestly? We built this app to help people chat with friends.
We don't want your data for weird reasons.
We just want you to have fun and not sue us.

Stay safe out there! 🛡️
`;

export const TermsOfService = () => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="link" size="sm" className="text-xs text-muted-foreground">
          <ScrollText className="h-3 w-3 mr-1" />
          Terms of Service
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScrollText className="h-5 w-5" />
            Terms of Service
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-[60vh] pr-4">
          <div className="prose prose-sm dark:prose-invert">
            {TOS_CONTENT.split('\n').map((line, i) => {
              if (line.startsWith('# ')) return <h1 key={i} className="text-xl font-bold">{line.slice(2)}</h1>;
              if (line.startsWith('## ')) return <h2 key={i} className="text-lg font-semibold text-muted-foreground">{line.slice(3)}</h2>;
              if (line.startsWith('### ')) return <h3 key={i} className="text-base font-semibold mt-4">{line.slice(4)}</h3>;
              if (line.startsWith('**') && line.endsWith('**')) return <p key={i} className="font-bold">{line.slice(2, -2)}</p>;
              if (line.startsWith('- ')) return <p key={i} className="ml-4">{line}</p>;
              if (line.startsWith('*')) return <p key={i} className="text-xs text-muted-foreground italic">{line}</p>;
              if (line.trim()) return <p key={i}>{line}</p>;
              return <br key={i} />;
            })}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export const PrivacyPolicy = () => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="link" size="sm" className="text-xs text-muted-foreground">
          <Shield className="h-3 w-3 mr-1" />
          Privacy Policy
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Privacy Policy
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-[60vh] pr-4">
          <div className="prose prose-sm dark:prose-invert">
            {PRIVACY_CONTENT.split('\n').map((line, i) => {
              if (line.startsWith('# ')) return <h1 key={i} className="text-xl font-bold">{line.slice(2)}</h1>;
              if (line.startsWith('## ')) return <h2 key={i} className="text-lg font-semibold text-muted-foreground">{line.slice(3)}</h2>;
              if (line.startsWith('### ')) return <h3 key={i} className="text-base font-semibold mt-4">{line.slice(4)}</h3>;
              if (line.startsWith('**') && line.endsWith('**')) return <p key={i} className="font-bold">{line.slice(2, -2)}</p>;
              if (line.startsWith('- ')) return <p key={i} className="ml-4">{line}</p>;
              if (line.startsWith('*')) return <p key={i} className="text-xs text-muted-foreground italic">{line}</p>;
              if (line.trim()) return <p key={i}>{line}</p>;
              return <br key={i} />;
            })}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

const LegalPages = () => {
  return (
    <div className="flex items-center gap-2">
      <TermsOfService />
      <span className="text-muted-foreground">•</span>
      <PrivacyPolicy />
    </div>
  );
};

export default LegalPages;
