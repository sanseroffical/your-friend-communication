import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Row {
  user_id: string;
  score: number;
  created_at: string;
  display_name?: string;
}

const GAMES: { id: string; title: string }[] = [
  { id: "tower_stacker_3d", title: "Tower Stacker" },
  { id: "asteroid_gunner_3d", title: "Asteroid Gunner" },
  { id: "neon_racer_3d", title: "Neon Racer" },
  { id: "plaza_parkour_3d", title: "Plaza Parkour" },
  { id: "plaza_arena_3d", title: "Plaza Arena" },
  { id: "cube_runner", title: "Cube Runner" },
  { id: "sky_shooter", title: "Sky Shooter" },
  { id: "snake", title: "Snake" },
  { id: "2048", title: "2048" },
  { id: "whack-a-mole", title: "Whack-a-Mole" },
  { id: "math-challenge", title: "Math Challenge" },
  { id: "crossword", title: "Crossword" },
];

export default function ArcadeLeaderboards() {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(GAMES[0].id);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancel = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("game_scores")
        .select("user_id, score, created_at")
        .eq("game_type", active)
        .order("score", { ascending: false })
        .limit(25);
      if (cancel) return;
      if (data && data.length) {
        const ids = Array.from(new Set(data.map((d) => d.user_id)));
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, display_name")
          .in("id", ids);
        const nm = new Map((profs ?? []).map((p) => [p.id, p.display_name as string]));
        setRows(data.map((d) => ({ ...d, display_name: nm.get(d.user_id) ?? "Player" })));
      } else {
        setRows([]);
      }
      setLoading(false);
    })();
    return () => { cancel = true; };
  }, [active, open]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Trophy className="h-4 w-4 text-primary" /> Leaderboards
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" /> Arcade Leaderboards
          </DialogTitle>
        </DialogHeader>
        <Tabs value={active} onValueChange={setActive}>
          <TabsList className="flex flex-wrap h-auto">
            {GAMES.map((g) => (
              <TabsTrigger key={g.id} value={g.id} className="text-xs">{g.title}</TabsTrigger>
            ))}
          </TabsList>
          {GAMES.map((g) => (
            <TabsContent key={g.id} value={g.id} className="mt-3">
              <ScrollArea className="h-80 pr-2">
                {loading ? (
                  <div className="text-center text-sm text-muted-foreground py-8">Loading…</div>
                ) : rows.length === 0 ? (
                  <div className="text-center text-sm text-muted-foreground py-8">No scores yet — be the first!</div>
                ) : (
                  <ol className="space-y-1">
                    {rows.map((r, i) => (
                      <li key={`${r.user_id}-${r.created_at}`} className="flex items-center justify-between text-sm px-2 py-1.5 rounded hover:bg-muted/50">
                        <span className="truncate">
                          <span className="font-mono text-muted-foreground mr-2">{String(i + 1).padStart(2, "0")}.</span>
                          {r.display_name}
                        </span>
                        <span className="font-mono text-primary">{r.score.toLocaleString()}</span>
                      </li>
                    ))}
                  </ol>
                )}
              </ScrollArea>
            </TabsContent>
          ))}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
