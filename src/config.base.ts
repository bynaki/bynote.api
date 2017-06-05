/**
 * configure
 * 보안이 필요한 정보나 설정을 저장한다.
 * 사용하려면 이 파일을 복사해 config.ts 파일을 만들어야 한다.
 */

import {resolve} from 'path'

// jwt 토큰을 만들기 위한 비밀키
export const secret = '8PoRtSwiTchIngHuB'

// jwt 토큰에 필요한 등록된 클레임
export const registeredClaim = {
  expiresIn: '1d',            // 만료 기간
  issuer: 'bynaki',           // 발급자
  subject: 'authentication',  // 제목
}

export const defaultPassword = 'foobar'

// static url && tmp url
export const url = {
  host: 'http://localhost:3000',
}

// static path && tmp path
export const path = {
  staticDir: resolve(__dirname, '../static'),
  secretPath: resolve(__dirname, 'secret.json'),
}

export const docset = {
  officialFeedUrl: 'https://api.github.com/repos/Kapeli/feeds/contents',
  docsetDir: resolve(__dirname, '../docsets'),
  documentsDir: 'Contents/Resources/Documents',
  dbPath: 'Contents/Resources/docSet.dsidx',
  tokensPath: 'Contents/Resources/tokens.xml',
  infoPath: 'Contents/info.plist',
  feedPath: 'feed.json',
  // dataName: '__data__.json',
  // feedDir: resolve(__dirname, '../docsets/feed.list'),
}
