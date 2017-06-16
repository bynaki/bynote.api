/**
 * test Resolver
 */

import {expect} from 'chai'
import * as request from 'supertest'
import {verify} from 'jsonwebtoken'
import p from 'fourdollar.promisify'
import {
  join,
  resolve,
} from 'path'
import {
  remove,
  exists,
} from '../fs.promise'
import server from './testserver'
import * as cf from '../config'
import {
  DocsetInfo,
  ExtendedFindResult,
} from '../interface'
cf.docset.docsetDir = resolve(__dirname, '../../docsets.test')


describe('test DocsetResolver ----------', function() {
  this.timeout(30000)
  
  before(async () => {
    await remove(cf.path.secretPath)
    const res: request.Response = await server.post('/graphql')
      .send({
        query: `
        mutation {
          token: createToken(
            hash: "hello"
            password: "foobar"
            expiresIn: "20s"
          )
        }
        `
      })
    token = res.body.data.token
    return
  })
  let token

  it('docset.officialFeedUrlList()', async () => {
    const res: request.Response = await server.post('/graphql')
      .send({
        query: `
        {
          docset {
            officialFeedUrlList
          }
        }
        `
      })
      .expect('Content-Type', /json/)
      .expect(200)
    expect(res.body).to.have.property('data')
    expect(res.body.data).to.have.property('docset')
    expect(res.body.data.docset).to.have.property('officialFeedUrlList')
    const officialFeedUrlList: string[] = res.body.data.docset.officialFeedUrlList
    expect(officialFeedUrlList).to.include('https://raw.githubusercontent.com/Kapeli/feeds/master/Bash.xml')
  })

  it('docset.list', async () => {
    const res: request.Response = await server.post('/graphql')
      .send({
        query: `
        {
          docset {
            list {
              name
              keyword
              scope
              info {
                CFBundleIdentifier
                CFBundleName
                DocSetPlatformFamily
              }
              feed {
                version
                ios_version
                urls
                other_versions
                feed_url
              }
            }
          }
        }
        `
      })
      .expect('Content-Type', /json/)
      .expect(200)
    expect(res.body).to.have.property('data')
    expect(res.body.data).to.have.property('docset')
    expect(res.body.data.docset).to.have.property('list')
    const list: DocsetInfo[] = res.body.data.docset.list
    const python2 = list.find(doc => doc.name === 'Python 2')
    expect(python2).to.be.ok
    expect(python2.name).to.equal('Python 2')
    expect(python2.keyword).to.equal('python2')
    expect(python2.scope).to.equal('OfficialDocset')
    expect(python2.info).to.be.ok
    expect(python2.feed).to.be.ok
    expect(python2.info).to.deep.equal({
      CFBundleIdentifier: 'python',
      CFBundleName: 'Python 2',
      DocSetPlatformFamily: 'python',
    })
    expect(python2.feed.feed_url).to
      .equal('https://raw.githubusercontent.com/Kapeli/feeds/master/Python_2.xml')
  })

  it('docset.find', async () => {
    const res: request.Response = await server.post('/graphql')
      .send({
        query: `
        {
          docset {
            results: find(
              name: "edit"
              ) {
              id
              name
              type
              path
              keyword
              scope
            }
          }
        }
        `
      })
      .expect('Content-Type', /json/)
      .expect(200)
    expect(res.body).to.have.property('data')
    expect(res.body.data).to.have.property('docset')
    expect(res.body.data.docset).to.have.property('results')
    const results: ExtendedFindResult[] = res.body.data.docset.results
    expect(results).to.have.length.above(0)
    results.forEach(item => {
      expect(/edit/.test(item.name.toLowerCase())).to.be.true
    })
    const others: string[] = []
    results.reduce((preScope, curr) => {
      if(preScope !== curr.keyword) {
        others.push(curr.keyword)
      }
      return curr.keyword
    }, '')
    expect(others).to.have.length.above(1)
  })

  it('docset.find: keyword option', async () => {
    const res: request.Response = await server.post('/graphql')
      .send({
        query: `
        {
          docset {
            results: find(
              name: "equal"
              option: {
                keyword: "chai"
              }
              ) {
              id
              name
              type
              path
              keyword
              scope
            }
          }
        }
        `
      })
      .expect('Content-Type', /json/)
      .expect(200)
    expect(res.body).to.have.property('data')
    expect(res.body.data).to.have.property('docset')
    expect(res.body.data.docset).to.have.property('results')
    const results: ExtendedFindResult[] = res.body.data.docset.results
    expect(results).to.have.length.above(0)
    results.forEach(item => {
      expect(/equal/.test(item.name.toLowerCase())).to.be.true
      expect(item.keyword).to.equal('chai')
      expect(item.scope).to.equal('OfficialDocset')
    })
  })

  it('docset.find: scope option', async () => {
    const res: request.Response = await server.post('/graphql')
      .send({
        query: `
        {
          docset {
            results: find(
              name: "edit"
              option: {
                scope: "OfficialDocset"
              }
              ) {
              id
              name
              type
              path
              keyword
              scope
            }
          }
        }
        `
      })
      .expect('Content-Type', /json/)
      .expect(200)
    expect(res.body).to.have.property('data')
    expect(res.body.data).to.have.property('docset')
    expect(res.body.data.docset).to.have.property('results')
    const results: ExtendedFindResult[] = res.body.data.docset.results
    expect(results).to.have.length.above(0)
    results.forEach(item => {
      expect(/edit/.test(item.name.toLowerCase())).to.be.true
      expect(item.scope).to.equal('OfficialDocset')
    })
  })

  it('docset.find: 퍼지 검색 option', async () => {
    const res: request.Response = await server.post('/graphql')
      .send({
        query: `
        {
          docset {
            results: find(
              name: "adeequ"
              option: {
                fuzzy: true
                keyword: "chai"
              }
              ) {
              id
              name
              type
              path
              keyword
              scope
            }
          }
        }
        `
      })
      .expect('Content-Type', /json/)
      .expect(200)
    expect(res.body).to.have.property('data')
    expect(res.body.data).to.have.property('docset')
    expect(res.body.data.docset).to.have.property('results')
    const results: ExtendedFindResult[] = res.body.data.docset.results
    expect(results).to.have.length.above(0)
    results.forEach(item => {
      expect(/a.*d.*e.*e.*q.*u/.test(item.name.toLowerCase())).to.be.true
      expect(item.keyword).to.equal('chai')
      expect(item.scope).to.equal('OfficialDocset')
    })
  })

  it('docset.find: limit option', async () => {
    const res: request.Response = await server.post('/graphql')
      .send({
        query: `
        {
          docset {
            results: find(
              name: "a"
              option: {
                fuzzy: true
                limit: 10
              }
              ) {
              id
              name
              type
              path
              scope
            }
          }
        }
        `
      })
      .expect('Content-Type', /json/)
      .expect(200)
      .expect('Access-Control-Allow-Origin', '*')
    expect(res.body).to.have.property('data')
    expect(res.body.data).to.have.property('docset')
    expect(res.body.data.docset).to.have.property('results')
    const results: ExtendedFindResult[] = res.body.data.docset.results
    expect(results.length % 10).to.equal(0)
  })

  it('docset.find: path', async () => {
    const res: request.Response = await server.post('/graphql')
      .send({
        query: `
        {
          docset {
            results: find(
              name: "equal"
              option: {
                keyword: "chai"
              }
              ) {
              id
              name
              type
              path
              keyword
              scope
            }
          }
        }
        `
      })
      .expect('Content-Type', /json/)
      .expect(200)
    expect(res.body).to.have.property('data')
    expect(res.body.data).to.have.property('docset')
    expect(res.body.data.docset).to.have.property('results')
    const results: ExtendedFindResult[] = res.body.data.docset.results
    expect(results).to.have.length.above(0)
    const result = results.find(item => item.path === 'http://localhost:3000/docsets/officialdocset/chai/chaijs.com/api/bdd/index.html#//apple_ref/Method/%2Eequal')
    expect(result).to.be.ok
  })

  it('docset.download: fail', async () => {
    const res: request.Response = await server.post('/graphql')
      .send({
        query: `
        mutation {
          docset {
            download(feed_url: "https://raw.githubusercontent.com/Kapeli/feeds/master/WordPress.xml")
          }
        }
        `
      })
      .expect('Content-Type', /json/)
      .expect(401)
    expect(res.body).to.have.property('data')
    expect(res.body.data).to.have.property('docset')
    expect(res.body.data.docset).to.have.property('download')
    const download = res.body.data.docset.download
    expect(download).to.be.null
    expect(res.body).to.have.property('errors')
    expect(res.body.errors[0].message).to.be.equal('must be authenticate!!')
  })

  // it('docset.download: success', async () => {
  //   const res: request.Response = await server.post('/graphql')
  //     .set('x-access-token', token)
  //     .send({
  //       query: `
  //       mutation {
  //         docset {
  //           download(feed_url: "https://raw.githubusercontent.com/Kapeli/feeds/master/CoffeeScript.xml")
  //         }
  //       }
  //       `
  //     })
  //     .expect('Content-Type', /json/)
  //     .expect(200)
  //   expect(res.body).to.have.property('data')
  //   expect(res.body.data).to.have.property('docset')
  //   expect(res.body.data.docset).to.have.property('download')
  //   const download = res.body.data.docset.download
  //   expect(download).to.be.true
  //   expect(await exists(join(cf.docset.docsetDir, 'CoffeeScript.docset')))
  //   .to.be.true
  // })
})