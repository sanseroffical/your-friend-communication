import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { 
  MoreHorizontal, 
  Reply, 
  Pin, 
  Forward, 
  Copy, 
  Trash2, 
  Edit2, 
  Flag,
  BookmarkPlus,
  Smile
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface EnhancedMessageActionsProps {
  messageId: string;
  content: string;
  isOwn: boolean;
  isPinned?: boolean;
  isBookmarked?: boolean;
  canModerate?: boolean;
  onReply: () => void;
  onEdit?: (newContent: string) => void;
  onDelete?: () => void;
  onPin?: () => void;
  onUnpin?: () => void;
  onForward?: () => void;
  onBookmark?: () => void;
  onReport?: () => void;
  onReact?: (emoji: string) => void;
}

const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🎉'];

const EnhancedMessageActions = ({
  messageId,
  content,
  isOwn,
  isPinned = false,
  isBookmarked = false,
  canModerate = false,
  onReply,
  onEdit,
  onDelete,
  onPin,
  onUnpin,
  onForward,
  onBookmark,
  onReport,
  onReact
}: EnhancedMessageActionsProps) => {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editContent, setEditContent] = useState(content);
  const [showQuickReactions, setShowQuickReactions] = useState(false);
  const { toast } = useToast();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      toast({ title: 'Copied to clipboard' });
    } catch {
      toast({ title: 'Failed to copy', variant: 'destructive' });
    }
  };

  const handleEdit = () => {
    if (onEdit && editContent.trim()) {
      onEdit(editContent.trim());
      setIsEditDialogOpen(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {/* Quick Reactions */}
        <div className="relative">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setShowQuickReactions(!showQuickReactions)}
          >
            <Smile className="w-4 h-4" />
          </Button>
          
          {showQuickReactions && (
            <div className="absolute bottom-full mb-1 left-0 flex gap-1 bg-popover border border-border rounded-full px-2 py-1 shadow-lg z-50">
              {QUICK_REACTIONS.map(emoji => (
                <button
                  key={emoji}
                  onClick={() => {
                    onReact?.(emoji);
                    setShowQuickReactions(false);
                  }}
                  className="hover:scale-125 transition-transform text-lg"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>

        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onReply}>
          <Reply className="w-4 h-4" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={handleCopy}>
              <Copy className="w-4 h-4 mr-2" />
              Copy Text
            </DropdownMenuItem>
            
            {onBookmark && (
              <DropdownMenuItem onClick={onBookmark}>
                <BookmarkPlus className="w-4 h-4 mr-2" />
                {isBookmarked ? 'Remove Bookmark' : 'Bookmark'}
              </DropdownMenuItem>
            )}

            {(canModerate || isOwn) && onPin && (
              <DropdownMenuItem onClick={isPinned ? onUnpin : onPin}>
                <Pin className="w-4 h-4 mr-2" />
                {isPinned ? 'Unpin Message' : 'Pin Message'}
              </DropdownMenuItem>
            )}

            {onForward && (
              <DropdownMenuItem onClick={onForward}>
                <Forward className="w-4 h-4 mr-2" />
                Forward
              </DropdownMenuItem>
            )}

            {isOwn && onEdit && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setIsEditDialogOpen(true)}>
                  <Edit2 className="w-4 h-4 mr-2" />
                  Edit Message
                </DropdownMenuItem>
              </>
            )}

            {(isOwn || canModerate) && onDelete && (
              <DropdownMenuItem 
                onClick={onDelete}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Message
              </DropdownMenuItem>
            )}

            {!isOwn && onReport && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={onReport}
                  className="text-orange-500 focus:text-orange-500"
                >
                  <Flag className="w-4 h-4 mr-2" />
                  Report Message
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Message</DialogTitle>
          </DialogHeader>
          <Textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            className="min-h-[100px]"
            placeholder="Edit your message..."
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEdit} disabled={!editContent.trim()}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default EnhancedMessageActions;
