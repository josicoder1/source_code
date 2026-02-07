// storage.js - wrapper around localStorage for app data
export const Storage = {
  key(prefix){ return `drivelite:${prefix}` },
  getJson(key, fallback){
    try{ const raw = localStorage.getItem(this.key(key)); return raw? JSON.parse(raw): fallback }
    catch(e){ return fallback }
  },
  setJson(key, obj){ localStorage.setItem(this.key(key), JSON.stringify(obj)) },
  getUsers(){ return this.getJson('users', []) },
  setUsers(u){ this.setJson('users', u) },
  getSession(){ return this.getJson('session', null) },
  setSession(s){ this.setJson('session', s) },
  getFiles(){ return this.getJson('files', []) },
  setFiles(f){ this.setJson('files', f) },
  getFolders(){ return this.getJson('folders', []) },
  setFolders(f){ this.setJson('folders', f) },
  getSettings(){ return this.getJson('settings', {theme:'light',lang:'en'}) },
  setSettings(s){ this.setJson('settings', s) }
}
