/**
 * RootAuthResolver
 */

import {DecodedToken} from '../../interface'
import RootResolver from './RootResolver'
import {
  encrypt,
  Dictionary
} from '../../utils'
import * as cf from '../../config'


export default class RootAuthResolver extends RootResolver {
  constructor(private _decodedToken: DecodedToken) {
    super()
  }


  //
  // Mutation

  async changePassword({oldPwd, newPwd}: {oldPwd: string, newPwd: string}): Promise<boolean> {
    if(await RootResolver._getPassword() !== encrypt(oldPwd)) {
      throw new Error('authentication failed')
    }
    const secret = await Dictionary.open(cf.path.secretPath)
    secret.set('password', encrypt(newPwd))
    await secret.save()
    return true
  }
}