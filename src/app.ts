/**
 * app
 */

import * as express from 'express'
import {Request, Response, NextFunction} from 'express'
import * as bodyParser from 'body-parser'
import * as cors from 'cors'
import {GraphQLError, GraphQLFormattedError} from 'graphql'
import * as graphqlHTTP from 'express-graphql'
import * as morgan from 'morgan'
import {join} from 'path'
import * as cf from './config'
import {
  schema, 
  RootResolver, 
  RootAuthResolver,
  DocsetResolver,
} from './schema'
import authorize from './middlewares/authorize'
import {GraphqlErrorMessages, ErrorWithStatusCode} from './utils'
import {
  DecodedToken,
  DocsetScope,
} from './interface'
import {
  ensureDir
} from './fs.promise'
import Docset from './Docset'


export class Server {
  private app: express.Application

  /**
   * express configuration
   */
  constructor() {
    this.app = express()

    // this.app.use(cors())

    // parse JSON and url-encoded query
    this.app.use(bodyParser.urlencoded({extended: false}))
    this.app.use(bodyParser.json())

    // print the request log on console
    this.app.use(morgan('dev'))

    // set the secret key variable for jwt
    this.app.set('jwt-secret', cf.secret)

    // authentication middleware
    this.app.use(authorize)

    // static 에 접근 할 수 있는지 
    // this.app.use('/static/:username'
    //   , (req: Request, res: Response, next: NextFunction) => {
    //   const decoded: DecodedToken = req['decoded']
    //   if(decoded && req.params.username === decoded.username) {
    //     next()
    //   } else {
    //     throw new ErrorWithStatusCode('Forbidden', 403)
    //   }
    // })

    // static 접근
    // this.app.use('/static', express.static(staticDir))

    this.app.use(`/docsets/:scope/:keyword`
      , async (req, res, next) => {
      const docsetResolver = new DocsetResolver()
      let doc;
      switch(req.params.scope) {
        case DocsetScope.OfficialDocset.toLowerCase(): {
          const docsets = await docsetResolver.list({scope: DocsetScope.OfficialDocset})
          doc = docsets.find(
            doc => doc.keyword === (req.params.keyword as string).toLowerCase()
          )
          break
        }
      }
      if(doc) {
        express.static(join(doc.path, cf.docset.documentsDir))(req, res, next)
      } else {
        next()
      }
    })

    // graphql middleware
    this.app.use('/graphql', cors(), graphqlHTTP((req: Request) => {
      const decodedToken = req['decoded']
      if(decodedToken) {
        return {
          schema,
          rootValue: new RootAuthResolver(decodedToken),
          graphiql: true,
        }
      } else {
        return {
          schema,
          rootValue: new RootResolver(),
          graphiql: true,
        }
      }
    }))

    this.app.use((req, res, next) => {
      res.status(404).end('Not Found')
    })

    // 내부 에러 처리
    this.app.use((err: ErrorWithStatusCode, req: Request, res: Response, next: NextFunction) => {
      let statusCode = (err.statusCode)? err.statusCode : 500
      res.status(statusCode).json({
        errors: new GraphqlErrorMessages((err as Error).message).errors
      })
    })
  }

  get application(): express.Application {
    return this.app
  }
}

// 디버깅에 활용하자
// function formatError(req: Request, res: Response, next: NextFunction) {
//   return (error: GraphQLError) => {
//     if(!error) {
//       throw new Error('Received null or undefined error.')
//     }
//     return {
//       message: error.message,
//       locations: error.locations,
//       path: error.path,
//     }
//   }
// }

// async function updateDocset() {
//   const docsets = await Docset.docsetList(cf.docset.docsetDir)
//   docsets.forEach(async docset => {
//     const newFeed = await Docset.feedJson(docset.feed.feed_url)
//     if(newFeed.version !== docset.feed.version) {
//       await Docset.download(docset.feed.feed_url, cf.docset.docsetDir)
//     }
//   })
// }