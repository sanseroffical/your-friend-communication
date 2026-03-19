// src/hooks/usePvP.ts

import { useState, useEffect } from 'react';

// Define types for player stats and match data
interface PlayerStats {
    id: string;
    name: string;
    health: number;
    attack: number;
    defense: number;
}

interface MatchData {
    player1: PlayerStats;
    player2: PlayerStats;
    winner: PlayerStats | null;
}

const usePvP = () => {
    const [players, setPlayers] = useState<PlayerStats[]>([]);
    const [matchHistory, setMatchHistory] = useState<MatchData[]>([]);
    const [currentMatch, setCurrentMatch] = useState<MatchData | null>(null);

    // Add a new player
    const addPlayer = (name: string) => {
        const newPlayer: PlayerStats = {
            id: `${Date.now()}`,
            name,
            health: 100,
            attack: Math.floor(Math.random() * 20),
            defense: Math.floor(Math.random() * 10),
        };
        setPlayers(prev => [...prev, newPlayer]);
    };

    // Start a match between two players
    const startMatch = (player1: PlayerStats, player2: PlayerStats) => {
        setCurrentMatch({ player1, player2, winner: null });
    };

    // Simulate a battle
    const battle = () => {
        if (!currentMatch) return;
        const { player1, player2 } = currentMatch;

        let p1Health = player1.health;
        let p2Health = player2.health;

        // Simplistic battle simulation
        while (p1Health > 0 && p2Health > 0) {
            p2Health -= Math.max(0, player1.attack - player2.defense);
            p1Health -= Math.max(0, player2.attack - player1.defense);
        }

        const winner = p1Health > 0 ? player1 : player2;
        setCurrentMatch({ ...currentMatch, winner });
        setMatchHistory(prev => [...prev, { ...currentMatch, winner }]);
    };

    return { players, addPlayer, startMatch, battle, matchHistory, currentMatch };
};

export default usePvP;