export type LeaderboardTopEntry = {
  studentId: string;
  points: number;
};

export type LeaderboardTop5Document = {
  top: LeaderboardTopEntry[];
  updatedAt: unknown;
};

export type LeaderboardDisplayEntry = {
  rank: number;
  studentId: string;
  totalPoints: number;
};

export type StudentRankSummary = {
  myRank: number | null;
  totalStudents: number;
};
