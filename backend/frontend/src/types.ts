export interface TestData {
  pixelError: number
  timing: number
  commitHash: string
  timeStamp: string
  nErrors: number
}

export interface TestRecord {
  group: string
  name: string
  hardware: string
  data: TestData[]
}

export type SortColumn =
  | 'pixelError'
  | 'timing'
  | 'commitHash'
  | 'timeStamp'
  | 'group'
  | 'name'
  | 'hardware'
