/**
 * test NoteDocset
 */

import {expect} from 'chai'
import * as request from 'supertest'
import NoteDocset from '../NoteDocset'
import {join} from 'path'
import {
  exists,
  remove,
} from '../fs.promise'


describe('test NoteDocset ----------', () => {
  before(async () => {
    docset = await NoteDocset.create(
      join(__dirname, 'tmp', 'note.docset'), {
        CFBundleIdentifier: 'note',
        CFBundleName: 'Note',
        DocSetPlatformFamily: 'Note',
        isDashDocset: true,
      })
  })
  let docset;

  it('NoteDocset.create()', async () => {
    const path = join(__dirname, 'tmp', 'note.docset')
    expect(await exists(join(path, 'Contents/Resources/Documents'))).to.be.true
    expect(await exists(join(path, 'Contents/info.plist'))).to.be.true
    expect(await exists(join(path, 'Contents/Resources/docSet.dsidx'))).to.be.true
  })

  after(async () => {
    await remove(join(__dirname, 'tmp', 'note.docset'))
  })
})