/**
 * test note
 */

import {expect} from 'chai'
import * as request from 'supertest'
import server from './testserver'


describe('test note ----------', () => {
  before(async () => {
    await server.post('/graphql')
      .send({
        query: `
        mutation {
          foobar: createUser(
            input: {
              username: "malco"
              password: "pwd"
              email: "malco@email.com"
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
            username: "malco"
            password: "pwd"
            expiresIn: "1d"
          )
        }
        `
      })
    token = res.body.data.token
  })
  let token: string

  it('createNote', async () => {
    const res: request.Response = await server.post('/graphql')
      .set('x-access-token', token)
      .send({
        query: `
        mutation {
          uuid: createNote
        }
        `
      })
      .expect(200)
      .expect('Content-Type', /json/)
    expect(res.body.data).to.have.property('uuid')
    expect(res.body.data.uuid).to.have.lengthOf(36)
    expect(res.body).to.have.not.property('errors')
  })
})