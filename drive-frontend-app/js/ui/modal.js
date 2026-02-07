export function openModal(innerHtml){
  const backdrop = document.createElement('div'); backdrop.className='modal-backdrop';
  const modal = document.createElement('div'); modal.className='modal card';
  modal.innerHTML = innerHtml;
  backdrop.appendChild(modal);
  backdrop.addEventListener('click', (e)=>{ if(e.target===backdrop) closeModal() })
  document.body.appendChild(backdrop);
  return {close:()=>closeModal()}
}
export function closeModal(){ const b = document.querySelector('.modal-backdrop'); if(b) b.remove() }
