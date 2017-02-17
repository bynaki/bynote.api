/**
 * test graphql
 */

import {expect} from 'chai'
import * as request from 'supertest'
import {verify} from 'jsonwebtoken'
import promisify from 'fourdollar.promisify'
import {Server} from '../app'
import {secret} from '../config'


describe('test graphql ----------', () => {
  const server = request(new Server().application.listen(1818))

  it('echo', async () => {
    const test = server.post('/graphql')
    const res: request.Response = await promisify(
      test.send({
        query: `
        {
          re: echo(message: "Hello World")
        }
        `,
      })
      .expect('Content-Type', /json/)
      .expect(200)
      .end, test)()
    expect(res.body).to.be.a('object')
    expect(res.body).to.have.property('data')
    expect(res.body.data).to.have.property('re')
    expect(res.body.data.re).to.equal('received Hello World')
  })

  it('createUser', async () => {
    const test = server.post('/graphql')
    const res: request.Response = await promisify(
      test.send({
        query: `
        mutation {
          bynaki: createUser(input: {
            username: "bynaki"
            password: "pwd"
            email: "bynaki@email.com"
            phone: "010-0000-0000"
          }) {
            id
            username
            email
          }
          hello: createUser(input: {
            username: "hello"
            password: "pwd"
            email: "hello@email.com"
            phone: "010-111-1111"
          }) {
            id
            username
            email
          }
          rozio: createUser(input: {
            username: "rozio"
            password: "pwd"
            email: "rozio@email.com"
            phone: "010-222-3333"
          }) {
            id
            username
            email
          }
        }
        `
      })
      .expect('Content-Type', /json/)
      .expect(200)
      .end, test)()
    expect(res.body).to.be.a('object')
    expect(res.body).to.have.property('data')
    expect(res.body.data).to.have.property('bynaki')
    expect(res.body.data.bynaki).to.deep.equal({
      id: res.body.data.bynaki.id,
      username: 'bynaki',
      email: 'bynaki@email.com',
    })
    expect(res.body.data.hello.username).to.be.equal('hello')
    expect(res.body.data.rozio.email).to.be.equal('rozio@email.com')
  })

  it('user', async () => {
    const test = server.post('/graphql')
    const res: request.Response = await promisify(
      test.send({
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
      .end, test)()
    expect(res.body).to.be.a('object')
    expect(res.body).to.have.property('data')
    expect(res.body.data).to.have.property('user') 
    expect(res.body.data.user).to.deep.equal({
      username: 'bynaki',
      email: 'bynaki@email.com',
    })
  })

  it('users', async () => {
    const test = server.post('/graphql')
    const res: request.Response = await promisify(
      test.send({
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
      .end, test)()
    expect(res.body).to.be.a('object')
    expect(res.body).to.have.property('data')
    expect(res.body.data).to.have.property('users')
    expect(res.body.data.users).to.have.lengthOf(3)
  })

  it('createToken', async () => {
    const test = server.post('/graphql')
    const res: request.Response = await promisify(
      test.send({
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
      .end, test)()
    expect(res.body.data).to.have.property('token')
    const token = res.body.data.token
    expect(token).to.be.not.null
    const decoded = await promisify(verify)(token, secret)
    expect(decoded.username).to.be.equal('bynaki')
    expect(decoded.email).to.be.equal('bynaki@email.com')
    expect(decoded.exp - decoded.iat).to.be.equal(1)
  })

  it('인증되지 않은 상태에서 myProfile를 query하면 에러가 난다.', async () => {
    const test = server.post('/graphql')
    const res: request.Response = await promisify(
      test.send({
        query: `
        {
          myProfile {
            id
            username
            email
            phone
          }
        }
        `
      })
      .expect('Content-Type', /json/)
      .expect(200)
      .end
    , test)()
    expect(res.body.data.myProfile).to.be.null
    expect(res.body.errors[0].message).to.be.equal('must be authenticate!!')
  })
  
  describe('인증상태: ', () => {
    let token

    before(async () => {
      const test = server.post('/graphql')
      const res: request.Response = await promisify(test.send({
        query: `
        mutation {
          token: createToken(
            username: "bynaki"
            password: "pwd"
            expiresIn: "1d"
          )
        }
        `
      }).end, test)()
      token = res.body.data.token
    })

    it('myProfile > header로 token', async () => {
      const test = server.post('/graphql')
      const res: request.Response = await promisify(
        test.set('x-access-token', token)
        .send({
          query: `
          {
            myProfile {
              id
              username
              email
              phone
            }
          }
          `
        })
        .expect('Content-Type', /json/)
        .expect(200)
        .end
      , test)()
      expect(res.body.data.myProfile).to.be.not.null
      expect(res.body.data.myProfile).to.be.deep.equal({
        id: '1',
        username: 'bynaki',
        email: 'bynaki@email.com',
        phone: '010-0000-0000',
      })
    })

    it('myProfile > query로 token', async () => {
      const test = server.post('/graphql')
      const res: request.Response = await promisify(
        test.query({token})
        .send({
          query: `
          {
            myProfile {
              id
              username
              email
              phone
            }
          }
          `
        })
        .expect('Content-Type', /json/)
        .expect(200)
        .end
      , test)()
      expect(res.body.data.myProfile).to.be.not.null
      expect(res.body.data.myProfile).to.be.deep.equal({
        id: '1',
        username: 'bynaki',
        email: 'bynaki@email.com',
        phone: '010-0000-0000',
      })
    })

    it('myProfile > 잘못된 token', async () => {
      const test = server.post('/graphql')
      const res: request.Response = await promisify(
        test.query({token: 'this is wrong token.'})
        .send({
          query: `
          {
            myProfile {
              id
              username
              email
              phone
            }
          }
          `
        })
        .expect('Content-Type', /json/)
        .expect(500)
        .end
      , test)()
      expect(res.body.errors[0].message).to.be.equal(
        'jwt malformed'
      )
    })
  })
})
