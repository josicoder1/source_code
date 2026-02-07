import { Storage } from '../storage.js'
import { Sidebar } from '../components/sidebar.js'
import { toast } from '../ui/toast.js'

export function renderShared(root){
  const layout = document.createElement('div'); layout.className='layout'
  layout.appendChild(Sidebar())
  const main = document.createElement('div'); main.className='container'
  main.innerHTML = `<div class="card"><h3>Shared Files</h3><div id="list"></div></div>`
  layout.appendChild(main); root.appendChild(layout)
  const list = main.querySelector('#list'); const files = Storage.getFiles().filter(f=>f.shared && !f.trashed)
  if(!files.length) list.innerHTML = '<div class="muted">No shared files</div>'
  files.forEach(f=>{ const el=document.createElement('div'); el.className='card'; el.style.marginTop='8px'; el.innerHTML = `<div style="display:flex;justify-content:space-between"><div><strong>${f.name}</strong><div class="muted">${new Date(f.createdAt).toLocaleString()}</div></div><div><button class="btn ghost">Copy Link</button><select><option>View</option><option>Edit</option></select></div></div>`; list.appendChild(el); el.querySelector('button').addEventListener('click', ()=>{ navigator.clipboard?.writeText(location.href+'#/files?id='+f.id); toast('Link copied (UI only)') }) })
}
