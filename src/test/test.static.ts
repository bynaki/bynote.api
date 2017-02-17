/**
 * test static
 */

import {expect} from 'chai'
import * as request from 'supertest'
import {verify} from 'jsonwebtoken'
import promisify from 'fourdollar.promisify'
import {Server} from '../app'
import {secret} from '../config'


describe('test static ----------', () => {
  const server = request(new Server().application.listen(2828))

  before(async () => {
    const process01 = server.post('/graphql')
    await promisify(
      process01.send({
        query: `
        mutation {
          createUser(
            input: {
              username: "foobar"
              password: "pwd"
              email: "foobar@email.com"
            }
          ) {
            id
            username
          }
        }
        `
      })
      .end, process01)()
    const process02 = server.post('/graphql')
    const res: request.Response = await promisify(
      process02.send({
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
      .end, process02)()
    token = res.body.data.token
  })
  let token: string

  it('aaa', () => {
    console.log('token: ', token)
  })
})