import { ReactNode, useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Pause, Play, RotateCcw, Trophy } from "lucide-react";
import { useGameScores, GameScoreRow } from "@/hooks/useGameScores";

interface Props {
  title: string;
  gameType: string;
  onBack: () => void;
  onRestart?: () => void;
  paused?: boolean;
  onTogglePause?: () => void;
  hud?: ReactNode;
  children: ReactNode;
}

export default function GameShell({ title, gameType, onBack, onRestart, paused, onTogglePause, hud, children }: Props) {
  const [showBoard, setShowBoard] = useState(false);
  const { scores } = useGameScores(gameType, 10);

  return (
    <div className="fixed inset-0 bg-black text-foreground overflow-hidden">
      {children}

      {/* Top HUD */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between p-3 pointer-events-none">
        <div className="glass rounded-xl px-3 py-2 pointer-events-auto flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={onBack} className="h-8">
            <ArrowLeft className="h-4 w-4 mr-1" /> Exit
          </Button>
          <div className="text-sm font-semibold text-primary">{title}</div>
        </div>
        <div className="glass rounded-xl px-3 py-2 pointer-events-auto flex items-center gap-2">
          {hud}
          {onTogglePause && (
            <Button size="sm" variant="ghost" onClick={onTogglePause} className="h-8 w-8 p-0">
              {paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
            </Button>
          )}
          {onRestart && (
            <Button size="sm" variant="ghost" onClick={onRestart} className="h-8 w-8 p-0">
              <RotateCcw className="h-4 w-4" />
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={() => setShowBoard((v) => !v)} className="h-8 w-8 p-0">
            <Trophy className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Leaderboard panel */}
      {showBoard && (
        <div className="absolute top-16 right-3 z-30 glass rounded-xl p-3 w-64 max-h-[60vh] overflow-auto">
          <div className="text-sm font-semibold mb-2 flex items-center gap-2">
            <Trophy className="h-4 w-4 text-primary" /> Top Scores
          </div>
          {scores.length === 0 && <div className="text-xs text-muted-foreground">No scores yet — be the first!</div>}
          <ol className="space-y-1">
            {scores.map((s: GameScoreRow, i) => (
              <li key={s.id} className="flex justify-between text-xs">
                <span className="truncate">{i + 1}. {s.display_name}</span>
                <span className="font-mono text-primary">{s.score}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {paused && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass rounded-2xl p-6 text-center">
            <div className="text-xl font-semibold mb-3">Paused</div>
            <Button onClick={onTogglePause}>Resume</Button>
          </div>
        </div>
      )}
    </div>
  );
}
