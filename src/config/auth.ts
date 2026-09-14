export const authConfig = {
  accessTokenSecret: process.env.ACCESS_TOKEN_SECRET!,
  refreshTokenSecret: process.env.REFRESH_TOKEN_SECRET!,

  accessTokenExpiresIn: "15m",
  refreshTokenExpiresInDays: 30,
};