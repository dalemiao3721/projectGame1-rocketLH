import { config } from 'dotenv'
config()

export const serverConfig = {
  port: parseInt(process.env.PORT || '4002', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/game_lobby',
  rtpSetting: parseInt(process.env.RTP_SETTING || '97', 10),
  volatilityLevel: parseInt(process.env.VOLATILITY_LEVEL || '3', 10),
  gameSecret: process.env.GAME_SECRET || 'rocket-lh-dev-secret',
  lobbyApiUrl: process.env.LOBBY_API_URL || 'http://localhost:3000',
}
