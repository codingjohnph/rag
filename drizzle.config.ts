import { readFileSync } from 'node:fs'
import { defineConfig } from 'drizzle-kit'

function loadEnvFile(path: string) {
  try {
    const content = readFileSync(path, 'utf-8')
    for (const line of content.split('\n')) {
      const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)="?([^"]*)"?$/)
      if (match && process.env[match[1]] === undefined) {
        process.env[match[1]] = match[2]
      }
    }
  } catch {
    return
  }
}

loadEnvFile('.env.local')
export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL_UNPOOLED ?? ''
  }
})
