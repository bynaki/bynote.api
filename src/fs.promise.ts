import * as fs from 'fs-extra'
import {
  Stats,
  OpenOptions,
  CopyFilter,
  CopyOptions,
} from 'fs-extra'
import p from 'fourdollar.promisify'


export function ensureDir(path: string): Promise<void> {
  return p(fs.ensureDir)(path)
}

export function copy(src: string, dest: string, options?: CopyOptions | CopyFilter): Promise<void> {
  return p(fs.copy)(src, dest, options)
}

export function readFile(filename: string, options?: fs.OpenOptions): Promise<Buffer> {
  return p(fs.readFile)(filename, options)
}

export function exists(path: string | Buffer): Promise<boolean> {
  return p(exists, false)(path)
}

export function readJson(file: string, options?: fs.OpenOptions): Promise<any> {
  return p(fs.readJson)(file, options)
}

export function writeJson(file: string, object: any, options?: OpenOptions): Promise<void> {
  return p(fs.writeJson)(file, object, options)
}

export function readdir(path: string | Buffer): Promise<string[]> {
  return p(fs.readdir)(path)
}

export function stat(path: string | Buffer): Promise<Stats> {
  return p(fs.stat)(path)
}

export function remove(dir: string): Promise<void> {
  return p(fs.remove)(dir)
}

/**
 * Asynchronous rename.
 * @param oldPath
 * @param newPath
 */
export function rename(oldPath: string, newPath: string): Promise<void> {
  return p(fs.rename)(oldPath, newPath)
}

