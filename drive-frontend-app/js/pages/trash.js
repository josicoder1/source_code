import { Storage } from '../storage.js'
import { Sidebar } from '../components/sidebar.js'
import { openModal, closeModal } from '../ui/modal.js'
import { toast } from '../ui/toast.js'

export function renderTrash(root){
  const layout = document.createElement('div'); layout.className='layout'
  layout.appendChild(Sidebar())
  const main = document.createElement('div'); main.className='container'
  main.innerHTML = `<div class="card"><h3>Trash</h3><div id="list"></div></div>`
  layout.appendChild(main); root.appendChild(layout)
  const list = main.querySelector('#list'); const files = Storage.getFiles().filter(f=>f.trashed)
  if(!files.length) list.innerHTML = '<div class="muted">Trash is empty</div>'
  files.forEach(f=>{ const el=document.createElement('div'); el.className='card'; el.style.marginTop='8px'; el.innerHTML = `<div style="display:flex;justify-content:space-between"><div><strong>${f.name}</strong></div><div><button class="btn ghost restore">Restore</button> <button class="btn" data-id="${f.id}">Delete Permanently</button></div></div>`; list.appendChild(el);
    el.querySelector('.restore').addEventListener('click', ()=>{ const fs=Storage.getFiles(); const ff=fs.find(x=>x.id===f.id); ff.trashed=false; Storage.setFiles(fs); toast('Restored'); renderTrash(root) })
    el.querySelector('button[data-id]').addEventListener('click', (e)=>{ const id=e.target.dataset.id; openModal(`<h4>Delete permanently?</h4><div style="display:flex;gap:8px;margin-top:12px"><button id=confirmDel class=\"btn\">Delete</button><button id=cancel class=\"btn ghost\">Cancel</button></div>`); document.querySelector('#confirmDel').addEventListener('click', ()=>{ const fs=Storage.getFiles(); Storage.setFiles(fs.filter(x=>x.id!==id)); closeModal(); toast('Deleted'); renderTrash(root) }); document.querySelector('#cancel').addEventListener('click', ()=>closeModal()) })
  })
}
