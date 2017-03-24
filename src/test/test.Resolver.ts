/**
 * test Resolver
 */

import {expect} from 'chai'
import * as request from 'supertest'
import server from './testserver'
import {verify} from 'jsonwebtoken'
import p from 'fourdollar.promisify'
import {
  remove
} from '../fs.promise'
import * as cf from '../config'
import {
  DocsetInfo,
  FindResult,
} from '../interface'


describe('test Resolver ----------', () => {
  before(async () => {
    return remove(cf.path.secretPath)
  })

  it('setProfile()', async () => {
    const res: request.Response = await server.post('/graphql')
      .send({
        query: `
        mutation {
          setProfile(
            profile: {
              name: "foobar"
              email: "foobar@naver.com"
            }
          ) {
            name
            email
            url
            bio
          }
        }
        `
      })
      .expect(200)
      .expect('Content-Type', /json/)
    expect(res.body).to.have.property('data')
    expect(res.body.data).to.have.property('setProfile')
    expect(res.body.data.setProfile).to.deep.equal({
      name: 'foobar',
      email: 'foobar@naver.com',
      url: null,
      bio: null,
    })
  })

  it('setProfile(): 덮어 쓰기.', async () => {
    const res: request.Response = await server.post('/graphql')
      .send({
        query: `
        mutation {
          setProfile(
            profile: {
              email: "foobar@daum.net"
            }
          ) {
            name
            email
            url
            bio
          }
        }
        `
      })
      .expect(200)
      .expect('Content-Type', /json/)
    expect(res.body).to.have.property('data')
    expect(res.body.data).to.have.property('setProfile')
    expect(res.body.data.setProfile).to.deep.equal({
      name: 'foobar',
      email: 'foobar@daum.net',
      url: null,
      bio: null,
    })
  })

  it('getProfile()', async () => {
    const res: request.Response = await server.post('/graphql')
      .send({
        query: `
        {
          getProfile {
            name
            email
            url
            bio
          }
        }
        `
      })
      .expect(200)
      .expect('Content-Type', /json/)
    expect(res.body).to.have.property('data')
    expect(res.body.data).to.have.property('getProfile')
    expect(res.body.data.getProfile).to.deep.equal({
      name: 'foobar',
      email: 'foobar@daum.net',
      url: null,
      bio: null,
    })
  })

  it('createToken()', async () => {
    const res: request.Response = await server.post('/graphql')
      .send({
        query: `
        mutation {
          token: createToken(
            hash: "hello"
            password: "foobar"
            expiresIn: "1s"
          )
        }
        `
      })
      .expect('Content-Type', /json/)
      .expect(200)
    expect(res.body.data).to.have.property('token')
    token01 = res.body.data.token
    expect(token01).to.be.not.null
    const decoded = await p(verify)(token01, cf.secret)
    expect(decoded.hash).to.equal('hello')
    expect(decoded.exp - decoded.iat).to.be.equal(1)
  })
  let token01: string;

  it('changePassword()', async () => {
    const res: request.Response = await server.post('/graphql')
      .set('x-access-token', token01)
      .send({
        query: `
        mutation {
          changePassword(
            oldPwd: "foobar"
            newPwd: "newfoobar"
          )
        }
        `
      })
      .expect(200)
      .expect('Content-Type', /json/)
    console.log(JSON.stringify(res.body.errors, null, '  '))
    expect(res.body.data).to.have.property('changePassword')
    expect(res.body.data.changePassword).to.be.true
  })

  it('createToken(): 해시를 바꾼 토큰 생성', async () => {
    const res: request.Response = await server.post('/graphql')
      .send({
        query: `
        mutation {
          token: createToken(
            hash: "world"
            password: "newfoobar"
            expiresIn: "1s"
          )
        }
        `
      })
      .expect('Content-Type', /json/)
      .expect(200)
    expect(res.body.data).to.have.property('token')
    token02 = res.body.data.token
    expect(token02).to.be.not.null
    const decoded = await p(verify)(token02, cf.secret)
    expect(decoded.hash).to.equal('world')
    expect(decoded.exp - decoded.iat).to.be.equal(1)
  })
  let token02: string;

  it('전의 토큰은 바뀐 해시 때문에 인증되지 않는다.', async () => {
    const res: request.Response = await server.post('/graphql')
      .set('x-access-token', token01)
      .send({
        query: `
        mutation {
          changePassword(
            oldPwd: "newfoobar"
            newPwd: "againfoobar"
          )
        }
        `
      })
      .expect(401)
    expect(res.body).to.have.property('errors')
    expect(res.body.errors[0].message).to.equal('This token expired early.')
  })

  it('docset.officialFeedUrlList()', async () => {
    const res: request.Response = await server.post('/graphql')
      .send({
        query: `
        {
          docset {
            officialFeedUrlList
          }
        }
        `
      })
      .expect('Content-Type', /json/)
      .expect(200)
    expect(res.body).to.have.property('data')
    expect(res.body.data).to.have.property('docset')
    expect(res.body.data.docset).to.have.property('officialFeedUrlList')
    const officialFeedUrlList: string[] = res.body.data.docset.officialFeedUrlList
    expect(officialFeedUrlList).to.include('https://raw.githubusercontent.com/Kapeli/feeds/master/Bash.xml')
  })

  it('docset.list', async () => {
    const res: request.Response = await server.post('/graphql')
      .send({
        query: `
        {
          docset {
            list {
              name
              keyword
              scope
              info {
                CFBundleIdentifier
                CFBundleName
                DocSetPlatformFamily
              }
              feed {
                version
                ios_version
                urls
                other_versions
                feed_url
              }
            }
          }
        }
        `
      })
      .expect('Content-Type', /json/)
      .expect(200)
    expect(res.body).to.have.property('data')
    expect(res.body.data).to.have.property('docset')
    expect(res.body.data.docset).to.have.property('list')
    const list: DocsetInfo[] = res.body.data.docset.list
    const python2 = list.find(doc => doc.name === 'Python 2')
    expect(python2).to.be.ok
    expect(python2.name).to.equal('Python 2')
    expect(python2.keyword).to.equal('python2')
    expect(python2.scope).to.equal('python2')
    expect(python2.info).to.be.ok
    expect(python2.feed).to.be.ok
    expect(python2.info).to.deep.equal({
      CFBundleIdentifier: 'python',
      CFBundleName: 'Python 2',
      DocSetPlatformFamily: 'python',
    })
    expect(python2.feed.feed_url).to
      .equal('https://raw.githubusercontent.com/Kapeli/feeds/master/Python_2.xml')
  })

  it('docset.find', async () => {
    const res: request.Response = await server.post('/graphql')
      .send({
        query: `
        {
          docset {
            results: find(
              name: "edit"
              ) {
              id
              name
              type
              path
              scope
            }
          }
        }
        `
      })
      .expect('Content-Type', /json/)
      .expect(200)
    expect(res.body).to.have.property('data')
    expect(res.body.data).to.have.property('docset')
    expect(res.body.data.docset).to.have.property('results')
    const results: FindResult[] = res.body.data.docset.results
    expect(results).to.have.length.above(0)
    results.forEach(item => {
      expect(/edit/.test(item.name.toLowerCase())).to.be.true
    })
    const others: string[] = []
    results.reduce((preScope, curr) => {
      if(preScope !== curr.scope) {
        others.push(curr.scope)
      }
      return curr.scope
    }, '')
    expect(others).to.have.length.above(1)
  })

  it('docset.find: scope option', async () => {
    const res: request.Response = await server.post('/graphql')
      .send({
        query: `
        {
          docset {
            results: find(
              name: "equal"
              option: {
                scope: "chai"
              }
              ) {
              id
              name
              type
              path
              scope
            }
          }
        }
        `
      })
      .expect('Content-Type', /json/)
      .expect(200)
    expect(res.body).to.have.property('data')
    expect(res.body.data).to.have.property('docset')
    expect(res.body.data.docset).to.have.property('results')
    const results: FindResult[] = res.body.data.docset.results
    expect(results).to.have.length.above(0)
    results.forEach(item => {
      expect(/equal/.test(item.name.toLowerCase())).to.be.true
      expect(item.scope).to.equal('chai')
    })
  })

  it('docset.find: 퍼지 검색 option', async () => {
    const res: request.Response = await server.post('/graphql')
      .send({
        query: `
        {
          docset {
            results: find(
              name: "adeequ"
              option: {
                fuzzy: true
                scope: "chai"
              }
              ) {
              id
              name
              type
              path
              scope
            }
          }
        }
        `
      })
      .expect('Content-Type', /json/)
      .expect(200)
    expect(res.body).to.have.property('data')
    expect(res.body.data).to.have.property('docset')
    expect(res.body.data.docset).to.have.property('results')
    const results: FindResult[] = res.body.data.docset.results
    expect(results).to.have.length.above(0)
    results.forEach(item => {
      expect(/a.*d.*e.*e.*q.*u/.test(item.name.toLowerCase())).to.be.true
      expect(item.scope).to.equal('chai')
    })
  })

  it('docset.find: limit option', async () => {
    const res: request.Response = await server.post('/graphql')
      .send({
        query: `
        {
          docset {
            results: find(
              name: "a"
              option: {
                fuzzy: true
                limit: 10
              }
              ) {
              id
              name
              type
              path
              scope
            }
          }
        }
        `
      })
      .expect('Content-Type', /json/)
      .expect(200)
    expect(res.body).to.have.property('data')
    expect(res.body.data).to.have.property('docset')
    expect(res.body.data.docset).to.have.property('results')
    const results: FindResult[] = res.body.data.docset.results
    expect(results.length % 10).to.equal(0)
  })
})