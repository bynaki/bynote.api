/**
 * resolvers's interfaces
 */

export interface Profile {
  name?: string
  email?: string
  url?: string
  bio?: string
}

export interface DecodedToken {
  hash: string
  iat: number   // 생성시간
  exp: number   // 만료시간
  iss: string   // 토큰 발급자
  sub: string   // 토큰 제목
}


export interface IHeadline {
  uuid: string
  level: number
  hash: string
  headline: string
  fullHeadline: string
  content: string
}

export interface INoteInput {
  uuid: string
  content?: string
  tags?: string[]
  origin?: string
}

export interface IImageHash {
  key: string
  value: string
}

export interface INoteSaving {
  content: string
  tags: string[]
  origin: string
  images: IImageHash[] 
  created_at: string
  updated_at: string
}

export interface INoteOutput extends INoteSaving {
  uuid: string
  url: string
  heads: IHeadline[]
}