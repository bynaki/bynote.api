/**
 * RootResolver
 * 인증이 필요 없는 resolver
 */

import {Request} from 'express'
import * as _ from 'lodash'
import {sign, SignOptions} from 'jsonwebtoken'
import p from 'fourdollar.promisify'
import {QueryBuilder} from 'knex'
import {database, encrypt} from '../../utils'
import {
  IUserOutput,
  IUserSaving,
  IUserInput,
  INoteInput,
  INoteOutput,
} from '../../interface'
import {registeredClaim} from '../../config'


export default class RootResolver {
  constructor() {
  }

  async user(query: {id?: string, username?: string}): Promise<IUserOutput> {
    const users = await RootResolver._findUsers(query)
    if(users.length != 0) {
      return users[0]
    } else {
      throw new Error('missing user!')
    }
  }

  async users(): Promise<IUserOutput[]> {
    return await RootResolver._findUsers({})
  }

  async myProfile(): Promise<IUserSaving> {
    throw new Error('must be authenticate!!')
  }

  async getNote(uuid: string): Promise<INoteOutput> {
    throw new Error('must be authenticate!!')
  }


  //
  // Mutation

  async createUser({input}: {input: IUserInput}): Promise<IUserOutput> {
    const userSaving = RootResolver._initUserSaving
    const knex = await database()
    if((await knex('user').select().limit(1)).length === 0) {
      userSaving.admin = true
    } else if((await RootResolver._findUsers({username: input.username})).length != 0) {
      throw new Error('username exists')
    }
    _.assign(userSaving, input)
    userSaving.password = encrypt(input.password)
    const ids: any[] = await knex('user').insert(userSaving)
    return this.user({id: ids[0]})
  }

  async createToken(
    {username, password, expiresIn}: 
    {username: string, password: string, expiresIn?: string}
    , req: Request): Promise<string> {
    const auth = await RootResolver._getUserSaving(username)
    if(auth.password !== encrypt(password)) {
      throw new Error('authentication failed')
    }
    const secret = req.app.get('jwt-secret')
    const options = _.clone(registeredClaim)
    if(expiresIn) {
      options.expiresIn = expiresIn
    }
    return p<(
      payload: string | Buffer | Object
      , secretOrPrivateKey: string | Buffer
      , options?: SignOptions) => Promise<string>>(sign)({
        id: auth.id,
        username: auth.username,
        email: auth.email,
        admin: auth.admin,
      },
      secret,
      options
    )
  }

  async createNote(): Promise<INoteOutput> {
    throw new Error('must be authenticate!!')
  }

  async saveNote({input}: {input: INoteInput}): Promise<INoteOutput> {
    throw new Error('must be authenticate!!')
  }


  //
  // utils

  protected static async _findUsers(query?: any): Promise<IUserOutput[]> {
    const knex = await database()
    return knex('user')
      .select('id', 'username', 'email', 'admin', 'created_at', 'updated_at')
      .where(query)
  }

  protected static async _getUserSaving(username: string): Promise<IUserSaving> {
    const knex = await database()
    const rows: IUserSaving[] = await knex('user')
      .select().where({username})
    if(rows.length !== 1) {
      throw new Error('must be 1')
    }
    return rows[0]
  }

  private static get _initUserSaving(): IUserSaving {
    return {
      username: '',
      password: '',
      email: '',
      admin: false,
      created_at: Date.now().toString(),
      updated_at: Date.now().toString(),
    } as IUserSaving
  }
}