/**
 * utils
 */

import * as Knex from 'knex'
import {resolve} from 'path'
import {createHmac} from 'crypto'
import {secret} from './config'


/**
 * 데이터 베이스 가져오기 (Knex)
 */
export async function database(): Promise<Knex> {
  if(_knex) {
    return _knex
  }
  const knex = Knex({
    client: 'sqlite3',
    connection: {
      filename: resolve(__dirname, 'mydb.sqlite'),
    }
  })
  await knex.schema.dropTableIfExists('user')
  await knex.schema.createTable('user', (table) => {
    table.increments('id')
    table.string('username')
    table.string('password')
    table.string('email')
    table.string('phone')
  })
  _knex = knex
  return knex
}
let _knex = null


/**
 * graphql에서 쓰는 Error 메시지 포멧과 똑같이
 */
export class GraphqlErrorMessages {
  private _errors: {message: string}[]

  constructor(message: string = null) {
    this._errors = []
    if(message !== null) {
      this.push(message)
    }
  }

  push(message: string): GraphqlErrorMessages {
    this._errors.push({message})
    return this
  }

  get errors(): {message: string}[] {
    return this._errors 
  }
}

/**
 * sha1 암호화
 */
export function encrypt(src: string): string {
  return createHmac('sha1', secret)
          .update(src)
          .digest('base64')
}


export class ErrorWithStatusCode extends Error {
  private _sc: number

  constructor(message?: string, statusCode: number = 500) {
    super(message)
    this._sc = statusCode
  }

  get statusCode() {
    return this._sc
  }
}