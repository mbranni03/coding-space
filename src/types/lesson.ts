export interface SubmissionRequest {
  userId: string
  conceptId: string
  code: string
}

export interface SubmissionResponse {
  passed: boolean
  attemptNumber: number
  compileResult: {
    exitCode: number
    stdout: string
    stderr: string
    runOutput?: {
      stdout: string
      stderr: string
    }
  }
  analysis: {
    passed: boolean
    feedback: string
    hintsForNextAttempt?: string[] // Array of strings or undefined
  }
  masteryUpdate: {
    previousScore: number
    newScore: number
    mastered: boolean
  }
}
