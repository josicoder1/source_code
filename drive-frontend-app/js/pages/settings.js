import { Storage } from '../storage.js'
import { Sidebar } from '../components/sidebar.js'
import { toast } from '../ui/toast.js'

export function renderSettings(root){
  const layout = document.createElement('div'); layout.className='layout'
  layout.appendChild(Sidebar())
  const main = document.createElement('div'); main.className='container'
  const s = Storage.getSettings();
  main.innerHTML = `<div class="card"><h3>Profile & Settings</h3>
    <div style="margin-top:12px"><label>Theme</label><select id="theme"><option value="light">Light</option><option value="dark">Dark</option></select></div>
    <div style="margin-top:12px"><label>Language</label><select id="lang"><option value="en">English</option><option value="es">Spanish</option></select></div>
    <div style="margin-top:12px"><h4>Change password</h4><input id="oldp" type="password" placeholder="Current" /><input id="newp" type="password" placeholder="New" /></div>
    <div style="margin-top:12px"><button id="save" class="btn">Save settings</button></div>
  </div>`
  layout.appendChild(main); root.appendChild(layout)
  main.querySelector('#theme').value = s.theme || 'light'; main.querySelector('#lang').value = s.lang || 'en'
  main.querySelector('#save').addEventListener('click', ()=>{ const settings = {...s,theme:main.querySelector('#theme').value,lang:main.querySelector('#lang').value}; Storage.setSettings(settings); document.documentElement.setAttribute('data-theme',settings.theme); toast('Settings saved') })
}
