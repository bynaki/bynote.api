/**
 * RootResolver
 * 인증이 필요 없는 resolver
 */

import {Request} from 'express'
import * as _ from 'lodash'
import {sign} from 'jsonwebtoken'
import promisify from 'fourdollar.promisify'
import {database, encrypt} from '../../utils'
import {
  IUser,
  IAuthorizer,
  IUserInput,
  INoteOutput,
} from '../../interface'
import {registeredClaim} from '../../config'


export default class RootResolver {
  constructor() {
  }

  async user(query: {id?: string, username?: string}): Promise<IUser> {
    const users = await this._findUsers(query)
    if(users.length != 0) {
      return users[0]
    } else {
      return null
    }
  }

  async users(): Promise<IUser[]> {
    return await this._findUsers({})
  }

  async myProfile(): Promise<IAuthorizer> {
    throw new Error('must be authenticate!!')
  }


  //
  // Mutation

  async createUser({input}: {input: IUserInput}): Promise<IUser> {
    const knex = await database()
    if((await this._findUsers({username: input.username})).length != 0) {
      throw new Error('username exists')
    }
    const userInput: IAuthorizer = _.clone<IUserInput>(input) as IAuthorizer
    userInput.password = encrypt(userInput.password)
    const now = Date.now().toString()
    userInput.created_at = now
    userInput.updated_at = now
    const ids: any[] = await knex('user').insert(userInput)
    return await this.user({id: ids[0]})
  }

  async createToken(
    {username, password, expiresIn}: 
    {username: string, password: string, expiresIn?: string}
    , req: Request): Promise<string> {
    const auth = await this._getAuthorizer(username)
    if(auth.password !== encrypt(password)) {
      throw new Error('authentication failed')
    }
    const secret = req.app.get('jwt-secret')
    const options = _.clone(registeredClaim)
    if(expiresIn) {
      options.expiresIn = expiresIn
    }
    const token = await promisify(sign)({
        id: auth.id,
        username: auth.username,
        email: auth.email,
      },
      secret,
      options
    )
    return token
  }

  async createNote(): Promise<INoteOutput> {
    throw new Error('must be authenticate!!')
  }


  //
  // protected

  protected async _findUsers(query?: any): Promise<IUser[]> {
    const knex = await database()
    const users: IUser[] = await knex('user')
      .select('id', 'username', 'email', 'created_at', 'updated_at').where(query)
    return users
  }

  protected async _getAuthorizer(username: string): Promise<IAuthorizer> {
    const knex = await database()
    const rows: IAuthorizer[] = await knex('user')
      .select().where({username})
    if(rows.length !== 1) {
      throw new Error('must be 1')
    }
    return rows[0]
  }
}