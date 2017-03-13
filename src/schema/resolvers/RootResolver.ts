/**
 * RootResolver
 * 인증이 필요 없는 resolver
 */

import {Request} from 'express'
import * as _ from 'lodash'
import {sign, SignOptions} from 'jsonwebtoken'
import p from 'fourdollar.promisify'
import {
  readJson,
  writeJson,
  readFile,
  writeFile,
  stat,
  readdir,
} from '../../fs.promise'
import {
  encrypt,
  Hash,
  Dictionary,
} from '../../utils'
import * as cf from '../../config'
import {
  Profile,
} from '../../interface'


export default class RootResolver {
  constructor() {
  }

  //
  // Query

  echo({message}: {message: string}): string {
    return `received '${message}`
  }

  async getProfile(): Promise<Profile> {
    const secret = await Dictionary.open(cf.path.secretPath)
    return secret.get('profile') || {}
  }

//   async feedList(): Promise<string[]> {
//     return readdir(dc.feedDir)
//   }


  //
  // Mutation

  async setProfile({profile}: {profile: Profile}): Promise<Profile> {
    const secret = await Dictionary.open(cf.path.secretPath)
    secret.set('profile'
      , RootResolver._revision(secret.get('profile'), profile))
    await secret.save()
    return secret.get('profile')
  }

  async createToken(
    {hash, password, expiresIn}: 
    {hash: string, password: string, expiresIn?: string}
    , req: Request): Promise<string> {
    if(await RootResolver._getPassword() !== encrypt(password)) {
      throw new Error('authentication failed')
    }
    const secret = req.app.get('jwt-secret')
    const options = _.clone(cf.registeredClaim)
    if(expiresIn) {
      options.expiresIn = expiresIn
    }
    return p<(
      payload: string | Buffer | Object
      , secretOrPrivateKey: string | Buffer
      , options?: SignOptions) => Promise<string>>(sign)({
        hash: Hash.set(hash),
      },
      secret,
      options
    )
  }


//   async download(feed: string): Promise<void> {
//     throw new Error('must be authenticate!!')
//   }


  //
  // utils
  protected static _revision(dest: Object, src: Object): Object {
    return _.assignWith(dest, src, (oldVal, srcVal) => {
      return (srcVal === null)? oldVal : srcVal
    })
  }

  protected static async _getPassword(): Promise<string> {
    const secret = await Dictionary.open(cf.path.secretPath)
    return secret.get('password') || encrypt(cf.defaultPassword)
  }
}