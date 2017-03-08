/**
 * test utils
 */

import {expect} from 'chai'
import {join} from 'path'
import {remove, exists} from '../fs.promise'
import {
  download
} from '../utils'

describe('test utils ----------', function() {
  this.timeout(10000)

  before(async () => {
    await remove(filename01)
    await remove(filename02)
    await remove(filename03)
  })

  const href01 = 'https://avatars0.githubusercontent.com/u/6610074?v=3&s=460'
  const filename01 = join(__dirname, 'tmp/href01.png')
  it('download(): 정상적으로 다운로드 한다.', async () => {
    const info = await download(href01, filename01)
    expect(info.headers).to.have.property('content-type')
    expect(info.headers['content-type']).to.match(/png/)
    expect(info.statusCode).to.equal(200)
    expect(await exists(filename01)).to.be.true
  })

  const href02 = 'http://www.naver.com/foobar.jpg'
  const filename02 = join(__dirname, 'tmp/href02.jpg')
  it('download(): 잘못된 href를 전달하면 예외가 발생한다.', async () => {
    try {
      await download(href02, filename02)
      expect(true).to.not.be.ok
    } catch(err) {
      expect((err as Error).message).to.equal('Not Found')
    }
  })

  const href03 = 'http://sanfrancisco.kapeli.com/feeds/Mocha.tgz'
  const filename03 = join(__dirname, 'tmp/mocha.docset')
  it('download(): 압축된 파일을 자동으로 압축을 풀고 저장한다.', async () => {
    const info = await download(href03, filename03)
    console.log(JSON.stringify(info.headers, null, ' '))
    expect(info.statusCode).to.eq(200)
    expect(info.headers).to.have.property('content-encoding')
    expect(info.headers['content-encoding']).to.eq('gzip')
    expect(await exists(filename03)).to.be.true
  })
})