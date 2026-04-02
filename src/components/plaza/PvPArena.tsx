import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Swords, Shield, Zap, Heart, Trophy, Sparkles } from "lucide-react";

// ============ TYPES ============
export interface PvPPlayer {
  id: string;
  name: string;
  level: number;
  maxHp: number;
  hp: number;
  attack: number;
  defense: number;
  special: number;
  avatarColor: string;
}

export interface PvPMatch {
  id: string;
  player: PvPPlayer;
  opponent: PvPPlayer;
  turn: "player" | "opponent";
  log: string[];
  status: "active" | "won" | "lost" | "draw";
  round: number;
}

type MoveType = "attack" | "heavy" | "defend" | "special";

// ============ STATS FROM LEVEL ============
export const statsFromLevel = (level: number) => ({
  maxHp: 80 + level * 20,
  attack: 8 + Math.floor(level * 2.5),
  defense: 4 + Math.floor(level * 1.5),
  special: 5 + level * 2,
});

// ============ COMBAT LOGIC ============
const calcDamage = (atk: number, def: number, move: MoveType): { damage: number; label: string } => {
  const variance = 0.85 + Math.random() * 0.3;
  const crit = Math.random() < 0.12;
  const critMult = crit ? 1.6 : 1;

  switch (move) {
    case "attack": {
      const dmg = Math.max(1, Math.round((atk - def * 0.4) * variance * critMult));
      return { damage: dmg, label: crit ? "⚡ Critical Strike!" : "🗡️ Attack" };
    }
    case "heavy": {
      const dmg = Math.max(2, Math.round((atk * 1.6 - def * 0.25) * variance * critMult));
      return { damage: dmg, label: crit ? "💥 Devastating Blow!" : "⚔️ Heavy Attack" };
    }
    case "defend":
      return { damage: 0, label: "🛡️ Defend" };
    case "special": {
      const dmg = Math.max(3, Math.round((atk * 1.3 + 10) * variance * critMult));
      return { damage: dmg, label: crit ? "🌟 SUPER Special!" : "✨ Special Move" };
    }
  }
};

// ============ CHALLENGE DIALOG ============
export const PvPChallengeDialog = ({
  open,
  challenger,
  onAccept,
  onDecline,
}: {
  open: boolean;
  challenger: string;
  onAccept: () => void;
  onDecline: () => void;
}) => (
  <Dialog open={open} onOpenChange={(o) => !o && onDecline()}>
    <DialogContent className="max-w-xs">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Swords className="h-5 w-5 text-destructive" /> PvP Challenge!
        </DialogTitle>
      </DialogHeader>
      <div className="text-center space-y-4 py-2">
        <p className="text-sm">
          <span className="font-bold text-primary">{challenger}</span> challenges you to a duel!
        </p>
        <div className="flex gap-2 justify-center">
          <Button variant="destructive" onClick={onAccept}>
            <Swords className="h-4 w-4 mr-1" /> Accept
          </Button>
          <Button variant="outline" onClick={onDecline}>
            Decline
          </Button>
        </div>
      </div>
    </DialogContent>
  </Dialog>
);

// ============ WAITING DIALOG ============
export const PvPWaitingDialog = ({
  open,
  targetName,
  onCancel,
}: {
  open: boolean;
  targetName: string;
  onCancel: () => void;
}) => (
  <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
    <DialogContent className="max-w-xs">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Swords className="h-5 w-5" /> Challenge Sent
        </DialogTitle>
      </DialogHeader>
      <div className="text-center space-y-3 py-2">
        <div className="animate-pulse">⚔️</div>
        <p className="text-sm">
          Waiting for <span className="font-bold text-primary">{targetName}</span> to respond...
        </p>
        <Button variant="outline" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </DialogContent>
  </Dialog>
);

// ============ HP BAR ============
const HpBar = ({ current, max, name, level, isPlayer }: { current: number; max: number; name: string; level: number; isPlayer: boolean }) => {
  const pct = Math.max(0, (current / max) * 100);
  const color = pct > 50 ? "bg-green-500" : pct > 25 ? "bg-yellow-500" : "bg-red-500";
  return (
    <div className={`flex flex-col gap-1 ${isPlayer ? "" : "items-end"}`}>
      <div className="flex items-center gap-2">
        {isPlayer && <Badge variant="outline" className="text-[10px]">Lv.{level}</Badge>}
        <span className="text-sm font-bold">{name}</span>
        {!isPlayer && <Badge variant="outline" className="text-[10px]">Lv.{level}</Badge>}
      </div>
      <div className="w-full h-3 bg-muted rounded-full overflow-hidden border">
        <div className={`h-full ${color} transition-all duration-500 rounded-full`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] text-muted-foreground">
        <Heart className="h-3 w-3 inline mr-0.5" />
        {Math.max(0, current)} / {max}
      </span>
    </div>
  );
};

// ============ MAIN COMBAT DIALOG ============
export const PvPCombatDialog = ({
  open,
  match,
  onMove,
  onClose,
}: {
  open: boolean;
  match: PvPMatch | null;
  onMove: (move: MoveType) => void;
  onClose: () => void;
}) => {
  const logEndRef = useRef<HTMLDivElement>(null);
  const [specialCooldown, setSpecialCooldown] = useState(0);
  const [defendCooldown, setDefendCooldown] = useState(0);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [match?.log.length]);

  // Reset cooldowns each round
  useEffect(() => {
    if (match?.round) {
      setSpecialCooldown((c) => Math.max(0, c - 1));
      setDefendCooldown((c) => Math.max(0, c - 1));
    }
  }, [match?.round]);

  if (!match) return null;

  const isMyTurn = match.turn === "player" && match.status === "active";
  const isFinished = match.status !== "active";

  const handleMove = (move: MoveType) => {
    if (!isMyTurn) return;
    if (move === "special" && specialCooldown > 0) return;
    if (move === "defend" && defendCooldown > 0) return;
    if (move === "special") setSpecialCooldown(3);
    if (move === "defend") setDefendCooldown(2);
    onMove(move);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Swords className="h-5 w-5 text-destructive" /> PvP Battle — Round {match.round}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* HP Bars */}
          <div className="grid grid-cols-2 gap-4">
            <HpBar current={match.player.hp} max={match.player.maxHp} name="You" level={match.player.level} isPlayer />
            <HpBar current={match.opponent.hp} max={match.opponent.maxHp} name={match.opponent.name} level={match.opponent.level} isPlayer={false} />
          </div>

          {/* VS visual */}
          <div className="flex items-center justify-center gap-4 py-2">
            <div className="w-12 h-12 rounded-full flex items-center justify-center text-2xl" style={{ backgroundColor: match.player.avatarColor + "33", border: `2px solid ${match.player.avatarColor}` }}>
              🧑
            </div>
            <span className="text-lg font-bold text-destructive animate-pulse">VS</span>
            <div className="w-12 h-12 rounded-full flex items-center justify-center text-2xl" style={{ backgroundColor: match.opponent.avatarColor + "33", border: `2px solid ${match.opponent.avatarColor}` }}>
              🧑
            </div>
          </div>

          {/* Battle log */}
          <ScrollArea className="h-28 border rounded-lg p-2 bg-muted/30">
            <div className="space-y-1">
              {match.log.map((entry, i) => (
                <p key={i} className={`text-xs ${entry.startsWith("🏆") || entry.startsWith("💀") ? "font-bold text-primary" : "text-muted-foreground"}`}>
                  {entry}
                </p>
              ))}
              <div ref={logEndRef} />
            </div>
          </ScrollArea>

          {/* Result overlay */}
          {isFinished && (
            <div className="text-center space-y-2 py-2">
              <div className="text-3xl">
                {match.status === "won" ? "🏆" : match.status === "lost" ? "💀" : "🤝"}
              </div>
              <p className="text-lg font-bold">
                {match.status === "won" ? "Victory!" : match.status === "lost" ? "Defeated!" : "Draw!"}
              </p>
              {match.status === "won" && (
                <p className="text-xs text-muted-foreground">+25 XP earned!</p>
              )}
              <Button onClick={onClose}>
                <Trophy className="h-4 w-4 mr-1" /> Close
              </Button>
            </div>
          )}

          {/* Action buttons */}
          {!isFinished && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Badge variant={isMyTurn ? "default" : "secondary"} className={isMyTurn ? "animate-pulse" : ""}>
                  {isMyTurn ? "Your Turn!" : "Opponent's Turn..."}
                </Badge>
                <span className="text-[10px] text-muted-foreground">Round {match.round}</span>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                <Button size="sm" variant="outline" disabled={!isMyTurn} onClick={() => handleMove("attack")} className="flex flex-col h-auto py-2">
                  <Swords className="h-4 w-4 mb-0.5" />
                  <span className="text-[10px]">Attack</span>
                </Button>
                <Button size="sm" variant="outline" disabled={!isMyTurn} onClick={() => handleMove("heavy")} className="flex flex-col h-auto py-2 text-destructive">
                  <Zap className="h-4 w-4 mb-0.5" />
                  <span className="text-[10px]">Heavy</span>
                </Button>
                <Button size="sm" variant="outline" disabled={!isMyTurn || defendCooldown > 0} onClick={() => handleMove("defend")} className="flex flex-col h-auto py-2 text-blue-500">
                  <Shield className="h-4 w-4 mb-0.5" />
                  <span className="text-[10px]">{defendCooldown > 0 ? `CD ${defendCooldown}` : "Defend"}</span>
                </Button>
                <Button size="sm" variant="outline" disabled={!isMyTurn || specialCooldown > 0} onClick={() => handleMove("special")} className="flex flex-col h-auto py-2 text-amber-500">
                  <Sparkles className="h-4 w-4 mb-0.5" />
                  <span className="text-[10px]">{specialCooldown > 0 ? `CD ${specialCooldown}` : "Special"}</span>
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ============ PROCESS COMBAT TURN ============
export const processTurn = (
  match: PvPMatch,
  playerMove: MoveType
): PvPMatch => {
  const opponentMoves: MoveType[] = ["attack", "attack", "heavy", "defend", "special"];
  const opponentMove = opponentMoves[Math.floor(Math.random() * opponentMoves.length)];

  const newLog = [...match.log];
  const player = { ...match.player };
  const opponent = { ...match.opponent };

  // Player's turn
  const playerResult = calcDamage(player.attack, opponent.defense, playerMove);
  const playerIsDefending = playerMove === "defend";

  if (playerMove === "defend") {
    newLog.push(`🛡️ You brace for impact! (Defense up)`);
  } else {
    const actualDmg = playerResult.damage;
    opponent.hp -= actualDmg;
    newLog.push(`${playerResult.label} — You deal ${actualDmg} damage!`);
  }

  // Check if opponent fainted
  if (opponent.hp <= 0) {
    opponent.hp = 0;
    newLog.push(`🏆 ${opponent.name} is defeated! You win!`);
    return { ...match, player, opponent, log: newLog, status: "won", round: match.round + 1 };
  }

  // Opponent's turn
  const oppResult = calcDamage(opponent.attack, player.defense, opponentMove);

  if (opponentMove === "defend") {
    newLog.push(`🛡️ ${opponent.name} defends!`);
  } else {
    let actualDmg = oppResult.damage;
    if (playerIsDefending) {
      actualDmg = Math.max(1, Math.floor(actualDmg * 0.35));
      newLog.push(`${oppResult.label} — ${opponent.name} deals ${actualDmg} damage (blocked!)`);
    } else {
      player.hp -= actualDmg;
      newLog.push(`${oppResult.label} — ${opponent.name} deals ${actualDmg} damage!`);
    }
    if (playerIsDefending) {
      // Reflect some damage
      const reflect = Math.floor(actualDmg * 0.3);
      if (reflect > 0) {
        opponent.hp -= reflect;
        newLog.push(`🪞 You reflect ${reflect} damage!`);
      }
    } else {
      player.hp -= 0; // already deducted above
    }
    // Recalculate since we may have subtracted wrong above
    // Fix: The damage deduction for non-defending case already happened above
  }

  // Check if player fainted
  if (player.hp <= 0) {
    player.hp = 0;
    newLog.push(`💀 You have been defeated by ${opponent.name}!`);
    return { ...match, player, opponent, log: newLog, status: "lost", round: match.round + 1 };
  }

  // Check if both somehow died (draw)
  if (opponent.hp <= 0 && player.hp <= 0) {
    return { ...match, player, opponent, log: newLog, status: "draw", round: match.round + 1 };
  }

  // Max rounds check
  if (match.round >= 20) {
    newLog.push("⏰ Time's up! The battle ends in a draw!");
    return { ...match, player, opponent, log: newLog, status: "draw", round: match.round + 1 };
  }

  return { ...match, player, opponent, log: newLog, turn: "player", round: match.round + 1 };
};

// ============ PVP ARENA SELECT DIALOG ============
interface NearbyPlayer {
  id: string;
  name: string;
}

export const PvPArenaDialog = ({
  open,
  onClose,
  nearbyPlayers,
  onChallenge,
}: {
  open: boolean;
  onClose: () => void;
  nearbyPlayers: NearbyPlayer[];
  onChallenge: (playerId: string) => void;
}) => (
  <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
    <DialogContent className="max-w-sm">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Swords className="h-5 w-5 text-destructive" /> PvP Arena
        </DialogTitle>
      </DialogHeader>
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Challenge another player in the plaza to a turn-based duel!
        </p>
        {nearbyPlayers.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Swords className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No other players nearby.</p>
            <p className="text-xs">Wait for others to join the plaza!</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground font-medium">Players in Plaza:</p>
            {nearbyPlayers.map((p) => (
              <div key={p.id} className="flex items-center justify-between p-2 border rounded-lg hover:bg-muted/50 transition-colors">
                <span className="text-sm font-medium">{p.name}</span>
                <Button size="sm" variant="destructive" onClick={() => onChallenge(p.id)}>
                  <Swords className="h-3 w-3 mr-1" /> Challenge
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </DialogContent>
  </Dialog>
);

export default PvPCombatDialog;
