import { Storage } from '../storage.js'
import { Sidebar } from '../components/sidebar.js'

export function renderDashboard(root){
  const container = document.createElement('div'); container.className='container'
  const layout = document.createElement('div'); layout.className='layout'
  layout.appendChild(Sidebar())
  const main = document.createElement('div')
  main.innerHTML = `
    <div class="card topbar">
      <div class="brand">Welcome to DriveLite</div>
      <div><button id="newFile" class="btn">Upload</button></div>
    </div>
    <div class="row">
      <div class="col card">
        <h3>Storage</h3>
        <div style="margin-top:8px"><div style="height:10px;background:rgba(0,0,0,0.06);border-radius:12px;overflow:hidden"><div id="bar" style="height:10px;background:linear-gradient(90deg,var(--accent),#7cc8ff);width:35%"></div></div></div>
      </div>
      <div class="col card">
        <h3>Recent Activity</h3>
        <ul id="recent"></ul>
      </div>
    </div>
  `
  layout.appendChild(main); container.appendChild(layout); root.appendChild(container)
  const files = Storage.getFiles(); const recent = root.querySelector('#recent');
  files.slice(-6).reverse().forEach(f=>{ const li=document.createElement('li'); li.textContent = `${f.name} • ${new Date(f.createdAt).toLocaleString()}`; recent.appendChild(li) })
}
