import { useState } from 'react';
import { Users, UserPlus, UserX, Ban, Check, X, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useFriendships } from '@/hooks/useFriendships';
import { supabase } from '@/integrations/supabase/client';

interface FriendsPanelProps {
  userId: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

const FriendsPanel = ({ userId, isOpen, onOpenChange }: FriendsPanelProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  const {
    friends,
    pendingRequests,
    sentRequests,
    blocks,
    isLoading,
    sendFriendRequest,
    acceptRequest,
    declineRequest,
    unfriend,
    blockUser,
    unblockUser,
    getFriendshipStatus,
  } = useFriendships(userId);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    
    const { data } = await supabase
      .from('profiles')
      .select('id, display_name, clip_id, avatar_url')
      .or(`clip_id.ilike.%${searchQuery}%,display_name.ilike.%${searchQuery}%`)
      .neq('id', userId)
      .limit(10);
    
    setSearchResults(data || []);
    setIsSearching(false);
  };

  const renderUserCard = (
    profile: { id: string; display_name: string | null; clip_id: string; avatar_url: string | null },
    actions: React.ReactNode
  ) => (
    <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-card">
      <div className="flex items-center gap-3">
        <Avatar className="h-10 w-10">
          <AvatarImage src={profile.avatar_url || undefined} />
          <AvatarFallback>{(profile.display_name || profile.clip_id).charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div>
          <p className="font-medium">{profile.display_name || profile.clip_id}</p>
          <p className="text-xs text-muted-foreground font-mono">@{profile.clip_id}</p>
        </div>
      </div>
      <div className="flex items-center gap-1">
        {actions}
      </div>
    </div>
  );

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Friends & Blocks
          </SheetTitle>
        </SheetHeader>

        <Tabs defaultValue="friends" className="mt-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="friends" className="text-xs">
              Friends
              {friends.length > 0 && <Badge variant="secondary" className="ml-1 h-4 px-1">{friends.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="requests" className="text-xs">
              Requests
              {pendingRequests.length > 0 && <Badge variant="default" className="ml-1 h-4 px-1">{pendingRequests.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="search" className="text-xs">Add</TabsTrigger>
            <TabsTrigger value="blocked" className="text-xs">Blocked</TabsTrigger>
          </TabsList>

          <TabsContent value="friends" className="mt-4">
            <ScrollArea className="h-[60vh]">
              <div className="space-y-2">
                {isLoading ? (
                  <p className="text-center text-muted-foreground py-8">Loading...</p>
                ) : friends.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No friends yet</p>
                    <p className="text-sm">Search for users to add them!</p>
                  </div>
                ) : (
                  friends.map((f) => f.profile && renderUserCard(f.profile, (
                    <>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => unfriend(f.id)} title="Unfriend">
                        <UserX className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => blockUser(f.profile!.id)} title="Block">
                        <Ban className="h-4 w-4" />
                      </Button>
                    </>
                  )))
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="requests" className="mt-4 space-y-4">
            {pendingRequests.length > 0 && (
              <div>
                <h3 className="text-sm font-medium mb-2">Incoming Requests</h3>
                <div className="space-y-2">
                  {pendingRequests.map((f) => f.profile && renderUserCard(f.profile, (
                    <>
                      <Button variant="default" size="icon" className="h-8 w-8" onClick={() => acceptRequest(f.id)} title="Accept">
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => declineRequest(f.id)} title="Decline">
                        <X className="h-4 w-4" />
                      </Button>
                    </>
                  )))}
                </div>
              </div>
            )}

            {sentRequests.length > 0 && (
              <div>
                <h3 className="text-sm font-medium mb-2">Sent Requests</h3>
                <div className="space-y-2">
                  {sentRequests.map((f) => f.profile && renderUserCard(f.profile, (
                    <Badge variant="secondary">Pending</Badge>
                  )))}
                </div>
              </div>
            )}

            {pendingRequests.length === 0 && sentRequests.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <UserPlus className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No pending requests</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="search" className="mt-4">
            <div className="flex gap-2 mb-4">
              <Input
                placeholder="Search by clip ID or name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
              <Button onClick={handleSearch} disabled={isSearching}>
                <Search className="h-4 w-4" />
              </Button>
            </div>
            <ScrollArea className="h-[50vh]">
              <div className="space-y-2">
                {searchResults.map((profile) => {
                  const status = getFriendshipStatus(profile.id);
                  return renderUserCard(profile, (
                    <>
                      {status === 'none' && (
                        <Button size="sm" onClick={() => sendFriendRequest(profile.id)}>
                          <UserPlus className="h-4 w-4 mr-1" /> Add
                        </Button>
                      )}
                      {status === 'friends' && <Badge variant="secondary">Friends</Badge>}
                      {status === 'pending' && <Badge variant="default">Pending</Badge>}
                      {status === 'sent' && <Badge variant="secondary">Sent</Badge>}
                      {status === 'blocked' && <Badge variant="destructive">Blocked</Badge>}
                    </>
                  ));
                })}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="blocked" className="mt-4">
            <ScrollArea className="h-[60vh]">
              <div className="space-y-2">
                {blocks.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Ban className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No blocked users</p>
                  </div>
                ) : (
                  blocks.map((b) => b.profile && renderUserCard(b.profile, (
                    <Button variant="outline" size="sm" onClick={() => unblockUser(b.id)}>
                      Unblock
                    </Button>
                  )))
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
};

export default FriendsPanel;
