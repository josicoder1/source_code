let toastTimer=null
export function toast(msg, opts={timeout:3000}){
  clearTimeout(toastTimer)
  let el = document.querySelector('.toast')
  if(!el){ el = document.createElement('div'); el.className='toast'; document.body.appendChild(el) }
  el.textContent = msg; el.style.opacity=1
  toastTimer = setTimeout(()=>{ if(el) el.style.opacity=0; setTimeout(()=>el?.remove(),400) }, opts.timeout)
}
