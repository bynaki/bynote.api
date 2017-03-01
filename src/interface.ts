/**
 * resolvers's interfaces
 */

export interface IUser {
  id: string
  username: string
  email: string
  created_at: string
  updated_at: string
}

export interface IAuthorizer extends IUser {
  password: string
}

export interface IAuthInput {
  username: string
  password: string
}

export interface IUserInput extends IAuthInput {
  email: string
}

export interface INote {
  uuid: string
  content: string
}


export interface IDecodedToken {
  id: string
  username: string
  email: string
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

export interface INoteSaving {
  content: string
  tags: string[]
  origin: string
  images: {}
  created_at: number
  updated_at: number
}

export interface INoteOutput extends INoteSaving {
  uuid: string
  heads: IHeadline[]
  url: string
}