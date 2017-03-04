/**
 * utils
 */

import * as Knex from 'knex'
import {join} from 'path'
import {createHmac, createHash} from 'crypto'
import {parse as parseUrl} from 'url'
import {createWriteStream} from 'fs'
import * as _ from 'lodash'
import {ServerResponse} from 'http'
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
      filename: join(__dirname, 'mydb.sqlite'),
    }
  })

  await knex.schema.dropTableIfExists('user')
  await knex.schema.createTable('user', table => {
    table.increments('id')
    table.string('username')
    table.string('password')
    table.string('email')
    table.boolean('admin')
    table.timestamp('created_at')
    table.timestamp('updated_at')
  })

  await knex.schema.dropTableIfExists('note-head')
  await knex.schema.createTable('note-head', table => {
    table.uuid('uuid')
    table.integer('level')
    table.string('hash')
    table.string('headline')
    table.string('fullHeadline')
    table.string('content')
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

/**
 * sha1 hash
 */
export function hash(src: string): string {
  return createHash('sha1')
          .update(src)
          .digest('hex')
}

/**
 * status code 와 함께 Error 객체
 */
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

/**
 * file download
 */
export function download(href: string, filename: string): Promise<{
  headers: any
  statusCode: number
  statusMessage: string
}> {
  let get = null
  const protocol = parseUrl(href).protocol
  if(protocol === 'http:') {
    get = require('http').get
  } else if(protocol === 'https:') {
    get = require('https').get
  } else {
    throw new Error('have to http: or https:')
  }
  return new Promise((resolve, reject) => {
    const request = get(href, res => {
      if(res.statusCode !== 200) {
        reject(new Error(res.statusMessage))
        return
      }
      res.on('end', () => {
        resolve({
          headers: _.clone(res.headers),
          statusCode: res.statusCode,
          statusMessage: res.statusMessage,
        })
      })
      res.on('error', reject)
      res.pipe(createWriteStream(filename).on('error', reject))
    })
    request.on('error', reject)
  })
}
