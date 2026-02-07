import { Auth } from '../auth.js'
import { toast } from '../ui/toast.js'

export function renderLogin(root){
  const html = `
    <div class="container">
      <div class="card" style="max-width:520px;margin:0 auto">
        <h2>Sign in to DriveLite</h2>
        <div style="margin-top:12px">
          <label>Email</label>
          <input id="email" type="email" placeholder="you@company.com" />
        </div>
        <div style="margin-top:12px">
          <label>Password</label>
          <div style="display:flex;gap:8px"><input id="pwd" type="password" /><button id="togglePwd" class="btn ghost">Show</button></div>
        </div>
        <div style="display:flex;align-items:center;justify-content:space-between;margin-top:12px">
          <label><input id="remember" type="checkbox"> Remember me</label>
          <a href="#/register">Register</a>
        </div>
        <div style="margin-top:14px"><button id="loginBtn" class="btn">Sign In</button></div>
      </div>
    </div>
  `
  root.innerHTML = html
  const toggle = root.querySelector('#togglePwd'); const pwd = root.querySelector('#pwd');
  toggle.addEventListener('click', ()=>{ if(pwd.type==='password'){pwd.type='text'; toggle.textContent='Hide'} else {pwd.type='password'; toggle.textContent='Show'} })
  root.querySelector('#loginBtn').addEventListener('click', ()=>{
    const email = root.querySelector('#email').value.trim(); const password = root.querySelector('#pwd').value;
    if(!email || !password){ toast('Please enter credentials'); return }
    try{ Auth.login({email,password,remember:root.querySelector('#remember').checked}); toast('Signed in'); location.hash = '#/dashboard' }
    catch(e){ toast(e.message||'Login failed') }
  })
}
