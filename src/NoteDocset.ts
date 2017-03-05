/**
 * NoteDocset
 */

import {
  ensureDir,
  stat,
  writeFile,
} from './fs.promise'
import {join} from 'path'
import * as _ from 'lodash'
import * as Knex from 'knex'


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
  private _knex: Knex

  private constructor(knex: Knex) {
    this._knex = knex
  }

  static async create(path: string, info: IDocsetInfo): Promise<NoteDocset> {
    try {
      await stat(path)
    } catch(err) {
      await ensureDir(join(path, 'Contents/Resources/Documents'))
      const knex = Knex({
        client: 'sqlite3',
        connection: {
          filename: join(path, 'Contents/Resources/docSet.dsidx'),
        },
      })
      await writeFile(join(path, 'Contents/info.plist'), NoteDocset._infoPlist(info))
      await knex.schema.createTable('searchIndex', table => {
        table.increments('id')
        table.text('name')
        table.string('type')
        table.text('path')
      })
      return new NoteDocset(knex)
    }
    throw new Error('docset exists already!')
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