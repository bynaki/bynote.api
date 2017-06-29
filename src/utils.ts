/**
 * utils
 */

import * as Knex from 'knex'
import {join} from 'path'
import {createHmac, createHash} from 'crypto'
import {parse as parseUrl} from 'url'
import {createWriteStream} from 'fs'
import * as _ from 'lodash'
import 'isomorphic-fetch'
import {RequestOptions} from 'http'
import * as targz from 'tar.gz'
import {
  writeJson,
  readJson,
} from './fs.promise'
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
// export class GraphqlErrorMessages {
//   private _errors: {message: string}[]

//   constructor(message: string = null) {
//     this._errors = []
//     if(message !== null) {
//       this.push(message)
//     }
//   }

//   push(message: string): GraphqlErrorMessages {
//     this._errors.push({message})
//     return this
//   }

//   get errors(): {message: string}[] {
//     return this._errors 
//   }
// }

/**
 * graphql에서 쓰는 Error 메시지 포멧과 똑같이
 */
export class GraphqlErrorMessageList {
  private _errors: MyErrorFormat[]

  constructor(error: Error = null) {
    this._errors = []
    if(error) {
      this.push(error)
    }
  }

  push(error: MyErrorFormat): GraphqlErrorMessageList {
    this._errors.push({
      message: error.message,
    })
    return this
  }

  get errors(): MyErrorFormat[] {
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
  constructor(public message: string, public statusCode: number = 500) {
    super(message)
  }
}

/**
 * 밖으로 내보낼 Error 포멧
 */
export interface MyErrorFormat {
  message: string
}

/**
 * file download
 */
export function download(
  href: string | RequestOptions
  , path: string
  , options?: {
    unzip: boolean
  }): Promise<{
  headers: any
  statusCode: number
  statusMessage: string
}> {
  let request = null
  const urlObj = (typeof href === 'string')? parseUrl(href) : href
  if(urlObj.protocol === 'http:') {
    request = require('http').get
  } else if(urlObj.protocol === 'https:') {
    request = require('https').get
  } else {
    throw new Error('have to http: or https:')
  }
  return new Promise((resolve, reject) => {
    const req = request(urlObj, res => {
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
      if(/x-tar/.test(res.headers['content-type'])) {
        // const extractor = Extract({path}).on('error', reject)
        // res.pipe(extractor)
        res.pipe(targz().createWriteStream(path).on('error', reject))
      } else {
        res.pipe(createWriteStream(path).on('error', reject))
      }
    })
    req.on('error', reject)
  })
}


export class Hash {
  private static _hash: string;

  static get(): string {
    return Hash._hash
  }

  static set(hash: string): string {
    Hash._hash = hash
    return Hash._hash
  }
}


export class Dictionary {
  private static _dicObjList = {}

  static async open(path: string): Promise<Dictionary> {
    if(Dictionary._dicObjList[path]) {
      return Dictionary._dicObjList[path]
    }
    try {
      const dic = await readJson(path)
      return new Dictionary(path, dic)
    } catch(err) {
      return new Dictionary(path, {})
    }
  }

  constructor(private _path: string, private _dic: Object) {
  }

  get(key: string): any {
    if(key === undefined) {
      return _.cloneDeep(this._dic)
    } else {
      return _.cloneDeep(this._dic[key])
    }
  }

  set(key: string | Object, value: any) {
    if(typeof key === 'string') {
      this._dic[key] = _.cloneDeep(value)
    } else {
      this._dic = _.assign(this._dic, _.cloneDeep(key))
    }
  }

  async save(): Promise<void> {
    return writeJson(this._path, this._dic)
  }
}