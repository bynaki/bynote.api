/**
 * test user
 */

import {expect} from 'chai'
import * as request from 'supertest'
import {verify} from 'jsonwebtoken'
import promisify from 'fourdollar.promisify'
import {secret} from '../config'
import server from './testserver'
import {
  IUserOutput,
  IUserSaving,
} from '../interface'


describe('test user ----------', () => {
  it('createUser', async () => {
    const res: request.Response = await server.post('/graphql')
      .send({
        query: `
        mutation {
          bynaki: createUser(input: {
            username: "bynaki"
            password: "pwd"
            email: "bynaki@email.com"
          }) {
            id
            username
            email
            admin
          }
          hello: createUser(input: {
            username: "hello"
            password: "pwd"
            email: "hello@email.com"
          }) {
            id
            username
            email
            admin
          }
          rozio: createUser(input: {
            username: "rozio"
            password: "pwd"
            email: "rozio@email.com"
          }) {
            id
            username
            email
            created_at
            updated_at
          }
        }
        `
      })
      .expect('Content-Type', /json/)
      .expect(200)
    expect(res.body).to.be.a('object')
    expect(res.body).to.have.property('data')
    expect(res.body.data).to.have.property('bynaki')
    expect(res.body.data.bynaki).to.deep.equal({
      id: res.body.data.bynaki.id,
      username: 'bynaki',
      email: 'bynaki@email.com',
      admin: true
    })
    const hello: IUserOutput = res.body.data.hello
    expect(hello.username).to.equal('hello')
    expect(hello.admin).to.eq(false)
    const rozio: IUserOutput = res.body.data.rozio
    expect(rozio.email).to.equal('rozio@email.com')
    expect(new Date(parseInt(rozio.created_at)).toString())
      .to.be.not.equal('Invalid Date')
    expect(new Date(parseInt(rozio.updated_at)).toString())
      .to.be.not.equal('Invalid Date')
  })

  it('user', async () => {
    const res: request.Response = await server.post('/graphql')
      .send({
        query: `
        {
          user(username: "bynaki") {
            username
            email
          }
        }
        `
      })
      .expect('Content-Type', /json/)
      .expect(200)
    expect(res.body).to.be.a('object')
    expect(res.body).to.have.property('data')
    expect(res.body.data).to.have.property('user') 
    expect(res.body.data.user).to.deep.equal({
      username: 'bynaki',
      email: 'bynaki@email.com',
    })
  })

  it('user > 없는 유저로 검색하면 에러가 난다.', async () => {
    const res: request.Response = await server.post('/graphql')
      .send({
        query: `
        {
          user(username: "wrong") {
            username
            email
          }
        }
        `
      })
      .expect('Content-Type', /json/)
      .expect(200)
    expect(res.body).to.be.a('object')
    expect(res.body).to.have.property('data')
    expect(res.body.data).to.have.property('user') 
    expect(res.body.data.user).to.be.a('null')
    expect(res.body).to.have.property('errors')
    expect(res.body.errors[0].message).to.eq('missing user!')
  })
  
  it('users', async () => {
    server.post('/graphql')
    const res: request.Response = await server.post('/graphql')
      .send({
        query: `
        {
          users {
            id
            username
            email
          }
        }
        `
      })
      .expect('Content-Type', /json/)
      .expect(200)
    expect(res.body).to.be.a('object')
    expect(res.body).to.have.property('data')
    expect(res.body.data).to.have.property('users')
    expect(res.body.data.users).to.have.lengthOf(3)
  })

  it('createToken', async () => {
    const res: request.Response = await server.post('/graphql')
      .send({
        query: `
        mutation {
          token: createToken(
            username: "bynaki"
            password: "pwd"
            expiresIn: "1s"
          )
        }
        `
      })
      .expect('Content-Type', /json/)
      .expect(200)
    expect(res.body.data).to.have.property('token')
    const token = res.body.data.token
    expect(token).to.be.not.null
    const decoded = await promisify(verify)(token, secret)
    expect(decoded.username).to.equal('bynaki')
    expect(decoded.email).to.equal('bynaki@email.com')
    expect(decoded.admin).to.equal(1) // true가 아니라 1을 반환한다.
    expect(decoded.exp - decoded.iat).to.be.equal(1)
  })

  it('인증되지 않은 상태에서 myProfile를 query하면 에러가 난다.', async () => {
    const test = server.post('/graphql')
    const res: request.Response = await server.post('/graphql')
      .send({
        query: `
        {
          myProfile {
            id
            username
            email
          }
        }
        `
      })
      .expect('Content-Type', /json/)
      .expect(200)
    expect(res.body.data.myProfile).to.be.null
    expect(res.body.errors[0].message).to.be.equal('must be authenticate!!')
  })
  
  describe('인증상태: ', () => {
    let token

    before(async () => {
      const res: request.Response = await server.post('/graphql')
        .send({
          query: `
          mutation {
            token: createToken(
              username: "bynaki"
              password: "pwd"
              expiresIn: "1d"
            )
          }
          `
        })
      token = res.body.data.token
    })

    it('myProfile > header로 token', async () => {
      const res: request.Response = await server.post('/graphql')
        .set('x-access-token', token)
        .send({
          query: `
          {
            myProfile {
              id
              username
              email
            }
          }
          `
        })
        .expect('Content-Type', /json/)
        .expect(200)
      expect(res.body.data.myProfile).to.be.not.null
      expect(res.body.data.myProfile).to.be.deep.equal({
        id: '1',
        username: 'bynaki',
        email: 'bynaki@email.com',
      })
    })

    it('myProfile > query로 token', async () => {
      const res: request.Response = await server.post('/graphql')
        .query({token})
        .send({
          query: `
          {
            myProfile {
              id
              username
              email
            }
          }
          `
        })
        .expect('Content-Type', /json/)
        .expect(200)
      expect(res.body.data.myProfile).to.be.not.null
      expect(res.body.data.myProfile).to.be.deep.equal({
        id: '1',
        username: 'bynaki',
        email: 'bynaki@email.com',
      })
    })

    it('myProfile > 잘못된 token', async () => {
      const res: request.Response = await server.post('/graphql')
        .query({token: 'this is wrong token.'})
        .send({
          query: `
          {
            myProfile {
              id
              username
              email
            }
          }
          `
        })
        .expect('Content-Type', /json/)
        .expect(401)
      expect(res.body.errors[0].message).to.be.equal('jwt malformed')
    })
  })
})
