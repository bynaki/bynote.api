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

  it('createToken', async () => {
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
    console.log(res.body.errors)
    expect(res.body.data).to.have.property('token')
    const token = res.body.data.token
    expect(token).to.be.not.null
    const decoded = await p(verify)(token, cf.secret)
    expect(decoded.hash).to.equal('hello')
    expect(decoded.exp - decoded.iat).to.be.equal(1)
  })
})