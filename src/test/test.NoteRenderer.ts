/**
 * test NoteRenderer
 */

import {expect} from 'chai'
import NoteRenderer from '../NoteRenderer'
import * as marked from 'marked'
import {
  readFile
} from '../fs.promise'
import {join} from 'path'


describe('test NoteRenderer ----------', () => {
  const renderer = new NoteRenderer('aabbcc')
  before(async () => {
    const src = (await readFile(join(__dirname, 'doc.md'))).toString()
    marked(src, {renderer})
  })

  it('NoteRenderer.heads[0]', () => {
    const head = renderer.heads[0]
    expect(head.uuid).to.equal('aabbcc')
    expect(head.level).to.equal(0)
    expect(head.hash).to.equal('head01')
    expect(head.headline).to.equal('Head01')
    expect(head.fullHeadline).to.equal('Head01')
    expect(head.content).to.have.lengthOf(80)
    const content = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Phasellus nibh ante, ornare'.slice(0, 80)
    expect(head.content).to.equal(content)
  })

  it('NoteRenderer.heads[3]', () => {
    const head = renderer.heads[3]
    expect(head.uuid).to.equal('aabbcc')
    expect(head.level).to.equal(2)
    expect(head.hash).to.equal('head02-2')
    expect(head.headline).to.equal('Head02-2')
    expect(head.fullHeadline).to.equal('Head01 - Head02-2')
    expect(head.content).to.have.lengthOf(80)
    const content = 'Integer imperdiet malesuada arcu, et viverra nisl blandit ac. Ut orci augue, auctor nec sem sit'.slice(0, 80)
    expect(head.content).to.equal(content)
  })
})
