import { Router } from './router.js'
import { renderLogin } from './pages/login.js'
import { renderRegister } from './pages/register.js'
import { renderDashboard } from './pages/dashboard.js'
import { renderFileManager } from './pages/file-manager.js'
import { renderShared } from './pages/shared.js'
import { renderTrash } from './pages/trash.js'
import { renderSettings } from './pages/settings.js'
import { Storage } from './storage.js'

const root = document.getElementById('app')
function mountWrapper(fn){ return (point)=>{ point.innerHTML=''; fn(point); }
}

// register routes
Router.add('/login', mountWrapper(renderLogin))
Router.add('/register', mountWrapper(renderRegister))
Router.add('/dashboard', mountWrapper(renderDashboard))
Router.add('/files', mountWrapper(renderFileManager))
Router.add('/shared', mountWrapper(renderShared))
Router.add('/trash', mountWrapper(renderTrash))
Router.add('/settings', mountWrapper(renderSettings))
Router.add('/', mountWrapper(renderDashboard))
Router.add('/404', (p)=> p.innerHTML = '<div class="container"><div class="card"><h3>Page not found</h3></div></div>')

// init
const settings = Storage.getSettings(); document.documentElement.setAttribute('data-theme', settings.theme||'light')
Router.mount(root)
