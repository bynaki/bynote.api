/**
 * RootAuthResolver
 * 인증이 필요한 resolver
 */

import {database} from '../../utils'
import {Request} from 'express'
import RootResolver from './RootResolver'
import {
  IUser,
  IAuthorizer,
  IUserInput,
  IDecodedToken,
} from '../../interface'


export default class RootAuthResolver extends RootResolver {
  constructor(private _decodedToken: IDecodedToken) {
    super()
  }

  async myProfile(): Promise<IAuthorizer> {
    const knex = await database()
    const users: IAuthorizer[] = await knex('user')
      .select().where({id: this._decodedToken.id})
    if(users.length === 0) {
      throw new Error('It is an unqualified authentication.')
    }
    return users[0]
  } 
  
  // async createPost(
  //   {input}: {
  //     input: {
  //       content: string,
  //       files: string,
  //     }
  //   }
  // ) {

  // }
}