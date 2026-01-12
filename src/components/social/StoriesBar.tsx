import { useState } from 'react';
import { Plus, Camera } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { StoryGroup } from '@/hooks/useStories';
import CreateStory from './CreateStory';
import StoryViewer from './StoryViewer';

interface StoriesBarProps {
  storyGroups: StoryGroup[];
  currentUserId: string | null;
  userAvatar: string | null;
  onCreateStory: (file: File, content?: string) => Promise<boolean>;
  onViewStory: (storyId: string) => void;
  onDeleteStory: (storyId: string) => void;
}

const StoriesBar = ({
  storyGroups,
  currentUserId,
  userAvatar,
  onCreateStory,
  onViewStory,
  onDeleteStory
}: StoriesBarProps) => {
  const [showCreate, setShowCreate] = useState(false);
  const [viewingGroup, setViewingGroup] = useState<StoryGroup | null>(null);

  const currentUserHasStory = storyGroups.some(g => g.userId === currentUserId);

  return (
    <>
      <div className="mb-4">
        <ScrollArea className="w-full whitespace-nowrap">
          <div className="flex gap-3 pb-2">
            {/* Add Story Button */}
            <button
              onClick={() => setShowCreate(true)}
              className="flex flex-col items-center gap-1 min-w-[70px]"
            >
              <div className="relative">
                <Avatar className="h-14 w-14 border-2 border-dashed border-primary">
                  <AvatarImage src={userAvatar || undefined} />
                  <AvatarFallback>
                    <Camera className="h-5 w-5" />
                  </AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-1 -right-1 bg-primary rounded-full p-0.5">
                  <Plus className="h-3 w-3 text-primary-foreground" />
                </div>
              </div>
              <span className="text-xs text-muted-foreground">Add Story</span>
            </button>

            {/* Story Groups */}
            {storyGroups.map((group) => (
              <button
                key={group.userId}
                onClick={() => setViewingGroup(group)}
                className="flex flex-col items-center gap-1 min-w-[70px]"
              >
                <div className={`rounded-full p-0.5 ${
                  group.hasUnviewed 
                    ? 'bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600' 
                    : 'bg-muted'
                }`}>
                  <Avatar className="h-14 w-14 border-2 border-background">
                    <AvatarImage src={group.avatarUrl || undefined} />
                    <AvatarFallback>
                      {group.userName?.charAt(0).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                </div>
                <span className="text-xs text-muted-foreground truncate max-w-[70px]">
                  {group.userId === currentUserId ? 'Your Story' : group.userName}
                </span>
              </button>
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>

      {/* Create Story Modal */}
      <CreateStory
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        onCreateStory={onCreateStory}
      />

      {/* Story Viewer */}
      {viewingGroup && (
        <StoryViewer
          storyGroup={viewingGroup}
          isOwner={viewingGroup.userId === currentUserId}
          currentUserId={currentUserId}
          onClose={() => setViewingGroup(null)}
          onViewStory={onViewStory}
          onDeleteStory={onDeleteStory}
        />
      )}
    </>
  );
};

export default StoriesBar;
