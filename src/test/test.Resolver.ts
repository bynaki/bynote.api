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
})