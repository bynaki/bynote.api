/**
 * test utils
 */

import {expect} from 'chai'
import {join} from 'path'
import {remove, exists} from '../fs.promise'
import {
  download
} from '../utils'

describe('utils', () => {
  before(async () => {
    await remove(filename01)
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
})