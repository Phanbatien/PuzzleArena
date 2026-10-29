namespace PuzzleArena.Api.Domain;

// Names match docs/TEAM-PLAN.md section 5 and the frontend unions in frontend/types/common.ts.
public enum GameType
{
    Sudoku,
    Minesweeper,
}

public enum Difficulty
{
    Easy,
    Medium,
    Hard,
}

public enum Role
{
    Player,
    Admin,
}

public enum AttemptStatus
{
    InProgress,
    Solved,
    Failed,
}

public enum TournamentStatus
{
    Open,
    Qualifier,
    QualifierDone,
    Final,
    Closed,
}

// BE3: which round a TournamentPuzzle belongs to.
public enum TournamentStage
{
    Qualifier,
    Final,
}

public enum BoosterType
{
    Hint,
    Shield,
}
