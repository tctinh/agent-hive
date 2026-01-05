import * as fs from 'fs'
import * as path from 'path'

export interface FeatureCreateParams {
  name: string
}

export interface FeatureCreateResult {
  path: string
  created: boolean
}

export async function hive_feature_create(
  params: FeatureCreateParams,
  context: { sessionId: string }
): Promise<FeatureCreateResult> {
  const hivePath = path.resolve(process.cwd(), '.hive')
  const featurePath = path.join(hivePath, 'features', params.name)

  fs.mkdirSync(path.join(featurePath, 'requirements'), { recursive: true })
  fs.mkdirSync(path.join(featurePath, 'context'), { recursive: true })
  fs.mkdirSync(path.join(featurePath, 'execution'), { recursive: true })
  fs.mkdirSync(path.join(featurePath, 'master'), { recursive: true })

  fs.writeFileSync(path.join(featurePath, 'requirements', 'ticket.md'), '')
  fs.writeFileSync(path.join(featurePath, 'context', 'decisions.md'), '')

  const sessions = {
    opencode: {
      sessionId: context.sessionId,
      lastActive: new Date().toISOString()
    }
  }
  fs.writeFileSync(
    path.join(featurePath, 'master', 'sessions.json'),
    JSON.stringify(sessions, null, 2)
  )

  return { path: featurePath, created: true }
}
