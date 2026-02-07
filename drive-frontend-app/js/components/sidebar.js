export function Sidebar(active){
  const el = document.createElement('div'); el.className='card sidebar';
  el.innerHTML = `
    <div class="brand">DriveLite</div>
    <nav style="margin-top:14px">
      <div class="nav-item" data-route="#/dashboard">Dashboard</div>
      <div class="nav-item" data-route="#/files">My Files</div>
      <div class="nav-item" data-route="#/shared">Shared</div>
      <div class="nav-item" data-route="#/trash">Trash</div>
      <div class="nav-item" data-route="#/settings">Settings</div>
    </nav>
  `;
  el.addEventListener('click', (e)=>{ const it=e.target.closest('.nav-item'); if(!it) return; location.hash = it.dataset.route.substring(1) })
  return el
}
