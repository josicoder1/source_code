import { Storage } from '../storage.js'
import { openModal, closeModal } from '../ui/modal.js'
import { toast } from '../ui/toast.js'
import { Sidebar } from '../components/sidebar.js'

function ensureDefaults(){ if(!Storage.getFiles().length){ Storage.setFiles([]) } if(!Storage.getFolders().length){ Storage.setFolders([{id:'root',name:'My Drive',parent:null}]) } }

function humanSize(n){ if(!n) return '-'; const kb = n/1024; if(kb<1024) return kb.toFixed(1)+' KB'; const mb=kb/1024; return mb.toFixed(1)+' MB' }

export function renderFileManager(root){ ensureDefaults();
  const container = document.createElement('div'); container.className='container'
  const layout = document.createElement('div'); layout.className='layout'
  layout.appendChild(Sidebar())
  const main = document.createElement('div')
  main.innerHTML = `
    <div class="card">
      <div class="fm-toolbar">
        <div style="display:flex;gap:8px"><button id="newFolder" class="btn ghost">New Folder</button><input id="fileInput" type="file" multiple style="display:none" /><button id="uploadBtn" class="btn">Upload</button></div>
        <div><input id="search" placeholder="Search files or folders" /></div>
      </div>
      <div id="drop" class="fm-drop muted card">Drag & drop files here or click Upload</div>
      <div style="margin-top:12px"><label><input id="viewToggle" type="checkbox"> Grid view</label></div>
      <div id="filesArea" style="margin-top:12px"></div>
    </div>
  `
  layout.appendChild(main); container.appendChild(layout); root.appendChild(container)

  const fileInput = root.querySelector('#fileInput'); const uploadBtn = root.querySelector('#uploadBtn'); const drop = root.querySelector('#drop'); const filesArea = root.querySelector('#filesArea'); const search = root.querySelector('#search')

  uploadBtn.addEventListener('click', ()=> fileInput.click())
  fileInput.addEventListener('change', (e)=> handleFiles(e.target.files))
  drop.addEventListener('dragover', (e)=>{ e.preventDefault(); drop.style.borderColor='var(--accent)'} )
  drop.addEventListener('dragleave', ()=>{ drop.style.borderColor='' })
  drop.addEventListener('drop', (e)=>{ e.preventDefault(); drop.style.borderColor=''; handleFiles(e.dataTransfer.files) })

  root.querySelector('#newFolder').addEventListener('click', ()=>{
    openModal(`<h3>Create folder</h3><input id="nf" placeholder="Folder name" /><div style="margin-top:12px"><button id="cf" class="btn">Create</button></div>`)
    document.querySelector('#cf').addEventListener('click', ()=>{
      const name = document.querySelector('#nf').value.trim(); if(!name){ toast('Enter name'); return }
      const folders = Storage.getFolders(); const f={id:Date.now().toString(),name,parent:'root'}; folders.push(f); Storage.setFolders(folders); closeModal(); toast('Folder created'); renderList()
    })
  })

  function handleFiles(list){ const files = Storage.getFiles(); for(const f of list){ const reader = new FileReader(); const fileObj={id:Date.now()+Math.random(),name:f.name,size:f.size,type:f.type||'unknown',createdAt:new Date().toISOString(),folderId:'root',data:null,shared:false,trashed:false}
      reader.onload = (ev)=>{ fileObj.data = ev.target.result; files.push(fileObj); Storage.setFiles(files); renderList(); toast('Uploaded '+fileObj.name) }
      if(f.type.startsWith('image/')) reader.readAsDataURL(f); else reader.readAsArrayBuffer(f)
    }
  }

  function renderList(){ const all = Storage.getFiles().filter(x=>!x.trashed); const q = search.value.trim().toLowerCase(); const filtered = all.filter(f=> f.name.toLowerCase().includes(q))
    filesArea.innerHTML = '';
    const grid = document.createElement('div'); grid.className = document.querySelector('#viewToggle').checked? 'file-grid': '';
    if(!document.querySelector('#viewToggle').checked){ const table = document.createElement('table'); table.className='table'; table.innerHTML = `<thead><tr><th></th><th>Name</th><th>Type</th><th>Size</th><th>Modified</th><th></th></tr></thead>`; const tbody=document.createElement('tbody')
      filtered.forEach(f=>{ const tr=document.createElement('tr'); tr.innerHTML = `<td><input data-id="${f.id}" type="checkbox" /></td><td>${f.name}</td><td>${f.type.split('/')[0]||'file'}</td><td>${humanSize(f.size)}</td><td>${new Date(f.createdAt).toLocaleString()}</td><td><button data-id="${f.id}" class="btn ghost preview">Preview</button> <button data-id="${f.id}" class="btn ghost del">Delete</button></td>`; tbody.appendChild(tr) })
      table.appendChild(tbody); filesArea.appendChild(table)
    } else { const fg=document.createElement('div'); fg.className='file-grid'; filtered.forEach(f=>{ const it=document.createElement('div'); it.className='file-item card'; const thumb = f.type.startsWith('image/')? `<img src="${f.data}" />` : `<div style="font-size:40px">📄</div>`; it.innerHTML = `<div>${thumb}</div><div style="margin-top:6px">${f.name}</div><div class="muted" style="font-size:12px">${humanSize(f.size)}</div><div style="margin-top:8px"><button data-id="${f.id}" class="btn ghost preview">Preview</button> <button data-id="${f.id}" class="btn ghost del">Delete</button></div>`; fg.appendChild(it) }); filesArea.appendChild(fg) }
    // attach actions
    filesArea.querySelectorAll('.del').forEach(b=>b.addEventListener('click', (e)=>{ const id=e.target.dataset.id; const fs=Storage.getFiles(); const f=fs.find(x=>x.id==id); if(!f) return; f.trashed=true; Storage.setFiles(fs); toast('Moved to Trash'); renderList() }))
    filesArea.querySelectorAll('.preview').forEach(b=>b.addEventListener('click', (e)=>{ const id=e.target.dataset.id; const f=Storage.getFiles().find(x=>x.id==id); if(!f) return; if(f.type.startsWith('image/')){ openModal(`<img src="${f.data}" style="max-width:100%" />`) } else { openModal(`<div style="padding:12px"><h4>${f.name}</h4><p class=\"muted\">Preview not available for this type</p></div>`) } }))
  }

  search.addEventListener('input', ()=>renderList()); root.querySelector('#viewToggle').addEventListener('change', ()=>renderList())
  renderList()
}
