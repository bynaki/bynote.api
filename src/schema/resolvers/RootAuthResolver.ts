/**
 * RootAuthResolver
 * 인증이 필요한 resolver
 */

import * as marked from 'marked'
import * as uuid from 'uuid'
import {join, basename} from 'path'
import {parse as parseUrl} from 'url'
import * as _ from 'lodash'
import {
  ensureDir,
  copy,
  readJson,
  writeJson,
  exists,
  readdir,
  stat,
  remove,
  rename,
} from '../../fs.promise'
import {
  database,
  download,
} from '../../utils'
import RootResolver from './RootResolver'
import {
  IUser,
  IUserOutput,
  IUserInput,
  IDecodedToken,
  INoteInput,
  IImageHash,
  INoteSaving,
  INoteOutput,
} from '../../interface'
import NoteRenderer from '../../NoteRenderer'
import * as config from '../../config'

const {
  noteTmpDir,
  noteDir,
  noteDataPath,
  noteDataTmpPath,
} = config.path

const {
  noteUrl,
  noteTmpUrl,
  noteFileUrl,
  noteTmpFileUrl,
} = config.url


export default class RootAuthResolver extends RootResolver {
  constructor(private _decodedToken: IDecodedToken) {
    super()
  }


  //
  // Query

  async myProfile(): Promise<IUserOutput> {
    const knex = await database()
    const users: IUserOutput[] = await knex('user')
      .select().where({id: this._decodedToken.id})
    if(users.length === 0) {
      throw new Error('It is an unqualified authentication.')
    }
    return users[0]
  } 

  async getNote(uuid: string): Promise<INoteOutput> {
    const {data: savingData, tmp} = await this._noteData(uuid)
    const note: INoteOutput = _.assign({}, savingData, {uuid}) as INoteOutput
    note.images = note.images.map(image => {
      return {
        key: image.key,
        value: (tmp)?
          noteTmpFileUrl(this.username, uuid, image.value) : 
          noteFileUrl(this.username, uuid, image.value)
      }
    })
    const knex = await database()
    _.assign(note, {heads: await knex('note-head').select().where({uuid})})
    note.url = (tmp)? noteUrl(this.username, uuid) : noteTmpUrl(this.username, uuid)
    return note
  }


  //
  // Mutation

  async createNote(): Promise<INoteOutput> {
    const id = uuid.v1()
    const tmpDir = noteTmpDir(this.username, id)
    await ensureDir(config.path.tmpDir)
    await writeJson(noteDataTmpPath(this.username, id), {
      content: '',
      images: [],
      tags: [],
      origin: '',
      created_at: Date.now().toString(),
      updated_at: Date.now().toString(),
    } as INoteSaving)

    return this.getNote(id)
  }

  async saveNote({input}: {input: INoteInput}): Promise<INoteOutput> {
    const {data, tmp} = await this._noteData(input.uuid)
    if(tmp) {
      await copy(noteTmpDir(this.username, input.uuid)
        , noteDir(this.username, input.uuid))
    }
    if(input.content !== null) {
      const renderer = new NoteRenderer(input.uuid)
      marked(input.content, {renderer})
      data.images = await this._processImage(input.uuid, renderer.images)
      data.content = input.content
      const knex = await database()
      await knex('note-head').where('uuid', input.uuid).del()
      const headPromises = renderer.heads.map(head => {
        return knex('note-head').insert(head)
      })
      await Promise.all(headPromises)
    }
    if(input.tags) {
      data.tags = input.tags
    }
    if(input.origin) {
      data.origin = input.origin
    }
    data.updated_at = Date.now().toString()

    await writeJson(noteDataPath(this.username, input.uuid), data)
    return this.getNote(input.uuid)
  }


  //
  // Utils

  private get username(): string {
    return this._decodedToken.username
  }

  private async _noteData(uuid: string)
    : Promise<{data: INoteSaving, tmp: boolean}> {
    try {
      return await readJson(noteDataPath(this.username, uuid))
    } catch(err) {
      try {
        return await readJson(noteDataTmpPath(this.username, uuid))
      } catch(err) {
        throw new Error('failed to find note that corresponds to uuid.')
      }
    }
  }

  private async _processImage(uuid: string, images: Map<string, string>): Promise<IImageHash[]> {
    const noteDirname = noteDir(this.username, uuid)
    let files = await readdir(noteDirname)
    files = files.filter(async file => {
      return (await stat(join(noteDirname, file))).isFile()
    }).map(file => {
      return basename(file)
    })
    
    const validImages: IImageHash[] = []
    images.forEach(async (value, key) => {
      if(!files.find(RootAuthResolver._exists(value))) {
        const protocal = parseUrl(key).protocol
        if(!(protocal === 'http:' || protocal === 'https:')) {
          console.warn(`
            http: 나 https: 포로토콜이 아니기 때문에 이미지를 다운로드 할 수 없다!
            url: ${key}
          `)
          return
        }
        const imgPath = join(noteDirname, value)
        const info = await download(key, imgPath)
        const contentType: string = info.headers['content-type']
        if(!contentType) {
          await remove(imgPath)
          console.warn(`
            ${key}:
            다운로드한 파일이 이미지인지 파악할 수 없다!
          `)
          return
        }
        if(!/image/.test(contentType)) {
          await remove(imgPath)
          console.warn(`
            ${key}:
            이미지 파일이 아니다!
          `)
          return
        }
        if(/png/.test(contentType)) {
          await rename(imgPath, imgPath + '.png')
          validImages.push({key, value: value + '.png'})
        } else if(/jpeg/.test(contentType)) {
          await rename(imgPath, imgPath + '.jpg')
          validImages.push({key, value: value + '.jpg'})
        } else if(/gif/.test(contentType)) {
          await rename(imgPath, imgPath + '.gif')
          validImages.push({key, value: value + '.gif'})
        } else {
          await remove(imgPath)
          console.warn(`
            ${key}:
            지원하는 이미지 포맷이 아니다!
          `)
          return
        }
      }
    })

    return validImages
  }

  private static _exists(filename: string): (value: string) => boolean {
    return (value: string): boolean => {
      return filename === value
    }
  }
}
