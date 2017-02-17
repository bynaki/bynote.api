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


export interface IDecodedToken {
  id: string
  username: string
  email: string
  iat: number   // 생성시간
  exp: number   // 만료시간
  iss: string   // 토큰 발급자
  sub: string   // 토큰 제목
}