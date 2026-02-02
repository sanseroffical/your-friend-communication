import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

export interface GameSession {
  id: string;
  room_code: string;
  game_type: string;
  created_by: string;
  state: Record<string, unknown>;
  players: string[];
  is_active: boolean;
  winner_id: string | null;
  created_at: string;
  updated_at: string;
}

export type GameType = "tictactoe" | "trivia" | "wordguess" | "rps" | "checkers" | "connect4";

export const useGames = (roomCode: string | null, userId: string) => {
  const [activeGame, setActiveGame] = useState<GameSession | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchActiveGame = useCallback(async () => {
    if (!roomCode) return;

    const { data, error } = await supabase
      .from("game_sessions")
      .select("*")
      .eq("room_code", roomCode)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (!error && data) {
      setActiveGame(data as unknown as GameSession);
    } else {
      setActiveGame(null);
    }
  }, [roomCode]);

  const createGame = async (gameType: GameType) => {
    if (!roomCode || !userId) return null;

    setIsLoading(true);
    try {
      // End any existing active games
      await supabase
        .from("game_sessions")
        .update({ is_active: false })
        .eq("room_code", roomCode)
        .eq("is_active", true);

      const initialState = getInitialGameState(gameType);
      
      const { data, error } = await supabase
        .from("game_sessions")
        .insert([{
          room_code: roomCode,
          game_type: gameType,
          created_by: userId,
          players: [userId],
          state: initialState as Json,
        }])
        .select()
        .single();

      if (error) throw error;
      setActiveGame(data as unknown as GameSession);
      return data;
    } catch (error) {
      console.error("Error creating game:", error);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const joinGame = async (gameId: string) => {
    if (!userId) return;

    try {
      const { data: game } = await supabase
        .from("game_sessions")
        .select("players")
        .eq("id", gameId)
        .single();

      if (!game) return;

      const currentPlayers = game.players || [];
      if (!currentPlayers.includes(userId)) {
        await supabase
          .from("game_sessions")
          .update({ players: [...currentPlayers, userId] })
          .eq("id", gameId);
      }
    } catch (error) {
      console.error("Error joining game:", error);
    }
  };

  const updateGameState = async (gameId: string, newState: Record<string, unknown>) => {
    try {
      const { error } = await supabase
        .from("game_sessions")
        .update({ 
          state: newState as Json,
          updated_at: new Date().toISOString(),
        })
        .eq("id", gameId);

      if (error) throw error;
    } catch (error) {
      console.error("Error updating game state:", error);
    }
  };

  const endGame = async (gameId: string, winnerId?: string) => {
    try {
      await supabase
        .from("game_sessions")
        .update({ 
          is_active: false,
          winner_id: winnerId || null,
        })
        .eq("id", gameId);

      setActiveGame(null);
    } catch (error) {
      console.error("Error ending game:", error);
    }
  };

  // Subscribe to game updates
  useEffect(() => {
    if (!roomCode) return;

    fetchActiveGame();

    const channel = supabase
      .channel(`games-${roomCode}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "game_sessions",
          filter: `room_code=eq.${roomCode}`,
        },
        (payload) => {
          if (payload.eventType === "DELETE") {
            setActiveGame(null);
          } else {
            const game = payload.new as unknown as GameSession;
            if (game.is_active) {
              setActiveGame(game);
            } else if (activeGame?.id === game.id) {
              setActiveGame(null);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomCode, fetchActiveGame]);

  return {
    activeGame,
    isLoading,
    createGame,
    joinGame,
    updateGameState,
    endGame,
  };
};

function getInitialGameState(gameType: GameType): Record<string, unknown> {
  switch (gameType) {
    case "tictactoe":
      return {
        board: Array(9).fill(null),
        currentPlayer: "X",
        playerX: null,
        playerO: null,
      };
    case "trivia":
      return {
        currentQuestion: 0,
        scores: {},
        questions: generateTriviaQuestions(),
      };
    case "wordguess":
      return {
        word: getRandomWord(),
        guesses: [],
        currentGuess: "",
        gameOver: false,
      };
    case "rps":
      return {
        choices: {},
        round: 1,
        scores: {},
      };
    case "checkers":
      return {
        board: null, // Created by component
        turn: 'red',
        players: {},
      };
    case "connect4":
      return {
        board: null, // Created by component
        turn: 'red',
        players: {},
      };
    default:
      return {};
  }
}

function generateTriviaQuestions() {
  return [
    { q: "What is the capital of France?", a: ["Paris", "London", "Berlin", "Madrid"], correct: 0 },
    { q: "Which planet is known as the Red Planet?", a: ["Venus", "Mars", "Jupiter", "Saturn"], correct: 1 },
    { q: "What year did World War II end?", a: ["1943", "1944", "1945", "1946"], correct: 2 },
    { q: "Who painted the Mona Lisa?", a: ["Michelangelo", "Da Vinci", "Raphael", "Picasso"], correct: 1 },
    { q: "What is the largest ocean?", a: ["Atlantic", "Indian", "Arctic", "Pacific"], correct: 3 },
  ];
}

function getRandomWord() {
  const words = ["REACT", "GAMES", "CLIPY", "PIXEL", "WORLD", "SPACE", "MUSIC", "DANCE"];
  return words[Math.floor(Math.random() * words.length)];
}
