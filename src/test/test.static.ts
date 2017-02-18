/**
 * test static
 */

import {expect} from 'chai'
import * as request from 'supertest'
import server from './testserver'


describe('test static ----------', () => {
  before(async () => {
    await server.post('/graphql')
      .send({
        query: `
        mutation {
          foobar: createUser(
            input: {
              username: "foobar"
              password: "pwd"
              email: "foobar@email.com"
            }
          ) {
            id
            username
          }
          myfriend: createUser(
            input: {
              username: "myfriend"
              password: "pwd"
              email: "myfriend@email.com"
            }
          ) {
            id
            username
          }
        }
        `
      })

    const res: request.Response = await server.post('/graphql')
      .send({
        query: `
        mutation {
          token: createToken(
            username: "foobar"
            password: "pwd"
            expiresIn: "1d"
          )
        }
        `
      })
    token = res.body.data.token
  })
  let token: string

  it('인증이 안되면 static에 접근할 수 없다.', async () => {
    const res: request.Response = await server.get('/static/foobar/hello.json')
      .expect(403)
      .expect('Content-Type', /json/)
    expect(res.body).to.have.property('errors')
    expect(res.body.errors[0].message).to.be.equal('Forbidden')
  })

  it('인증하고 static에 정상적으로 접근한다.', async () => {
    const res: request.Response = await server.get('/static/foobar/hello.json')
      .set('x-access-token', token)
      .expect(200)
      .expect('Content-Type', /json/)
    expect(res.body).to.have.property('data')
    expect(res.body.data).to.be.equal('Hello World!')
  })

  it('다른 author의 static에 접근할 수 없다.', async () => {
    const res: request.Response = await server.get('/static/myfriend/hello.json')
      .set('x-access-token', token)
      .expect(403)
      .expect('Content-Type', /json/)
    expect(res.body).to.have.property('errors')
    expect(res.body.errors[0].message).to.be.equal('Forbidden')
  })
})