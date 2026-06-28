export type LeaderboardEntry = {
  rank: number;
  studentId: string;
  totalPoints: number;
};

export type StudentLeaderboard = {
  entries: LeaderboardEntry[];
  myRank: number | null;
  totalStudents: number;
};
