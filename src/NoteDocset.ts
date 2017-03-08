/**
 * NoteDocset
 */

import {
  ensureDir,
  stat,
  writeFile,
  writeJson,
  readJson,
  readdir,
  remove,
  rename,
} from './fs.promise'
import {
  join,
  basename,
} from 'path'
import * as _ from 'lodash'
import * as Knex from 'knex'
import {v1 as newUuid} from 'uuid'
import {parse as parseUrl} from 'url'
import * as i from './interface'
import {docset as config} from './config'
import NoteRenderer from './NoteRenderer'
import {download} from './utils'


// <?xml version="1.0" encoding="UTF-8"?>
// <!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
// <plist version="1.0">
// <dict>
//   <key>CFBundleIdentifier</key>
//   <string>Facebook</string>
//   <key>CFBundleName</key>
//   <string>Redux</string>
//   <key>DocSetPlatformFamily</key>
//   <string>Redux</string>
//   <key>DashDocSetFamily</key>
//   <string>dashtoc</string>
//   <key>isDashDocset</key>
//   <true/>
//   <key>isJavaScriptEnabled</key>
//   <true/>
//   <key>dashIndexFilePath</key>
//   <string>redux/index.html</string>
// </dict>
// </plist>
export interface IDocsetInfo {
  CFBundleIdentifier: string
  CFBundleName: string
  DocSetPlatformFamily: string
  isDashDocset: boolean
  DashDocSetFamily?: string
  isJavaScriptEnabled?: boolean
  dashIndexFilePath?: string
}


export default class NoteDocset {
  private _path: string
  private _knex: Knex

  private constructor(path: string, knex: Knex) {
    this._path = path
    this._knex = knex
  }

  static async create(path: string, info: IDocsetInfo): Promise<NoteDocset> {
    try {
      await stat(path)
    } catch(err) {
      await ensureDir(join(path, config.documentsDir))
      const knex = Knex({
        client: 'sqlite3',
        connection: {
          filename: join(path, config.dbPath),
        },
      })
      await writeFile(join(path, config.infoPath), NoteDocset._infoPlist(info))
      await knex.schema.createTable('searchIndex', table => {
        table.increments('id')
        table.text('name')
        table.string('type')
        table.text('path')
        table.uuid('uuid')
      })
      await knex.schema.createTable('heads', table => {
        table.uuid('uuid')
        table.integer('level')
        table.text('hash')
        table.text('headline')
        table.text('fullHeadline')
        table.text('content')
      })
      return new NoteDocset(path, knex)
    }
    throw new Error('note\'s docset exists already!')
  }

  static async open(path: string): Promise<NoteDocset> {
    try {
      await stat(join(path, config.documentsDir))
    } catch(err) {
      throw new Error("note's docset doesn't exist!")
    }
    const knex = Knex({
      client: 'sqlite3',
      connection: {
        filename: join(path, config.dbPath),
      },
    })
    return new NoteDocset(path, knex)
  }

  get path(): string {
    return this._path
  }
  
  get knex(): Knex {
    return this._knex
  }

  async newNote(): Promise<Note> {
    const uuid = newUuid()
    const notePath = join(this.path, 'Contents/Resources/Documents', uuid)
    await ensureDir(notePath)
    await writeJson(join(notePath, '__data__.json'), {
      content: '',
      images: [],
      tags: [],
      origin: '',
      created_at: Date.now().toString(),
      updated_at: Date.now().toString(),
    } as i.INoteSaving)
    return new Note(uuid, this)
  }

  getNote(uuid: string): Note {
    return new Note(uuid, this)
  }

  async delNote(uuid: string) {
    await this.knex('searchIndex').where('uuid', uuid).del()
    await this.knex('heads').where('uuid', uuid).del()
    await remove(join(this.path, config.documentsDir, uuid))
  }

  private static _infoPlist(info: IDocsetInfo): string {
    const keys = _.keys(info)
    const items = keys.map(key => {
      return `  <key>${key}</key>
  ${NoteDocset._makeValue(info[key])}`
    }).join('\n')
    return `
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
${items}
</dict>
</plist>
`
  }

  private static _makeValue(value: string | boolean): string {
    if(typeof value === 'string') {
      return `<string>${value}</string>`
    } else {
      return (value)? '<true/>' : '<false/>'
    }
  }
}



export class Note {
  private _knex: Knex;
  private _notePath: string;

  constructor(
    private _uuid: string,
    private _docset: NoteDocset,
  ) {
    this._knex = _docset.knex
    this._notePath = join(_docset.path, config.documentsDir, _uuid)
  }

  async getData(): Promise<i.INoteSaving> {
    return readJson(join(this._notePath, config.dataName))
  }

  async saveData(input: i.INoteInput) {
    const data = await this.getData()
    if(input.content !== null) {
      const renderer = new NoteRenderer(this.uuid)
      const html = marked(input.content, {renderer})
      data.images = await this._processImage(renderer.images)
      data.images.forEach(image => {
        const pattern = new RegExp(image.key, 'g')
        html.replace(pattern, image.value)
      })
      data.content = input.content
      this._knex('heads').where('uuid', input.uuid).del()
      // const headPromises = renderer.heads.map(head => {
      //   return this._knex('heads').insert(head)
      // })
      // await Promise.all(headPromises)
      renderer.heads.forEach(async head => await this._knex('heads').insert(head))
      data.tags = (input.tags)? input.tags : data.tags
      data.origin = (input.origin)? input.origin : data.origin
      data.updated_at = Date.now().toString()
    }
  }

  private async _processImage(images: Map<string, string>): Promise<i.IImageHash[]> {
    let files = await readdir(this._notePath)
    files = files.filter(async file => {
      return (await stat(join(this._notePath, file))).isFile()
    }).map(file => {
      return basename(file)
    })
    const validImages: i.IImageHash[] = []
    images.forEach(async (value, key) => {
      if(!files.find(file => file === value)) {
        const protocal = parseUrl(key).protocol
        if(!(protocal === 'http:' || protocal === 'https:')) {
          console.warn(`
            http: 나 https: 포로토콜이 아니기 때문에 이미지를 다운로드 할 수 없다!
            url: ${key}
          `)
          return
        }
        const imgPath = join(this._notePath, value)
        const info = await download(key, imgPath)
        const contentType: string = info.headers['content-type']
        if(!contentType) {
          await remove(imgPath)
          console.warn(`
            다운로드한 파일이 이미지인지 파악할 수 없다!
            url: ${key}
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

  get uuid(): string {
    return this._uuid
  }
}