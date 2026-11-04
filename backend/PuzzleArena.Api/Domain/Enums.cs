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

// BE3: Open (đăng ký) -> Qualifier (chỉ khi đông người) -> Knockout (nhánh loại trực tiếp) -> Closed.
public enum TournamentStatus
{
    Open,
    Qualifier,
    Knockout,
    Closed,
}

public enum MatchStatus
{
    Pending,
    Live,
    Done,
}

public enum BoosterType
{
    Hint,
    Shield,
}
