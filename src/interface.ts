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


export interface DocsetInfoPlist {
  CFBundleIdentifier: string
  CFBundleName: string
  DocSetPlatformFamily: string
  isDashDocset?: boolean
  DashDocSetKeyword?: string
}

export interface DocsetFeed {
  version: string
  ios_version: string
  urls: string[]
  other_versions: string[]
}

export interface DocsetFeedWithUrl extends DocsetFeed {
  feed_url: string
}

export interface DocsetInfo {
  name: string
  keyword: string
  scope: string
  info: DocsetInfoPlist
  feed: DocsetFeedWithUrl
}

export interface FindOption {
  fuzzy?: boolean
  limit?: number
}

export interface ExtendedFindOption extends FindOption {
  keyword?: string
  scope?: string
}

export interface DocItem {
  name: string
  type: string
  path: string
}

export interface FindResult extends DocItem {
  id: string
}

export interface ExtendedFindResult extends FindResult {
  keyword: string
  scope: string
}

export class DocsetScope {
  static get OfficialDocset(): string {
    return 'OfficialDocset'
  }
  static get PublicNote(): string {
    return 'PublicNote'
  }
  static get PrivateNote(): string {
    return 'PrivateNote'
  }
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