/**
 * schema
 */

import {GraphQLSchema, buildSchema} from 'graphql'
import * as glob from 'glob'
import {readFileSync} from 'fs'
import {resolve} from 'path'
import RootResolver from './resolvers/RootResolver'
import RootAuthResolver from './resolvers/RootAuthResolver'
import DocsetResolver from './resolvers/DocsetResolver'

// schema 파일 합치기
const matches = glob.sync('typedefs/**/*.+(graphql|gql)', {cwd: __dirname})
const typeDefs = matches.reduce((pre, match) => {
  return pre + '\n' + readFileSync(resolve(__dirname, match)).toString()
}, '')

export const schema = buildSchema(typeDefs)
export {
  RootResolver, 
  RootAuthResolver,
  DocsetResolver,
}
