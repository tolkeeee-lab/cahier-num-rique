import fs from 'fs'
import path from 'path'

const DB_PATH = path.join(process.cwd(), 'cahier_mock_db.json')

export function getLocalDb(): any[] {
  try {
    if (!fs.existsSync(DB_PATH)) {
      fs.writeFileSync(DB_PATH, JSON.stringify([]))
      return []
    }
    const data = fs.readFileSync(DB_PATH, 'utf-8')
    return JSON.parse(data || '[]')
  } catch (e) {
    console.error('[localDb] Failed to read local DB:', e)
    return []
  }
}

export function saveLocalDb(data: any[]) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2))
  } catch (e) {
    console.error('[localDb] Failed to write local DB:', e)
  }
}
