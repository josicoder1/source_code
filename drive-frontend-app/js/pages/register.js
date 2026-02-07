import { Auth } from '../auth.js'
import { toast } from '../ui/toast.js'

function passwordStrength(p){ if(!p) return 'Empty'; if(p.length<6) return 'Weak'; if(/[A-Z]/.test(p) && /\d/.test(p)) return 'Good'; return 'Medium' }

export function renderRegister(root){
  root.innerHTML = `
    <div class="container">
      <div class="card" style="max-width:620px;margin:0 auto">
        <h2>Create an account</h2>
        <div style="margin-top:12px"><label>Name</label><input id="name" /></div>
        <div style="margin-top:12px"><label>Email</label><input id="email" type="email" /></div>
        <div style="margin-top:12px"><label>Password</label><input id="pwd" type="password" /></div>
        <div style="margin-top:8px"><small id="strength" class="muted">Strength: </small></div>
        <div style="margin-top:12px"><label>Confirm Password</label><input id="pwd2" type="password" /></div>
        <div style="margin-top:14px"><button id="regBtn" class="btn">Register</button> <a href="#/login" style="margin-left:12px">Sign in</a></div>
      </div>
    </div>
  `
  const pwd = root.querySelector('#pwd'); const strength = root.querySelector('#strength');
  pwd.addEventListener('input', ()=> strength.textContent = 'Strength: ' + passwordStrength(pwd.value))
  root.querySelector('#regBtn').addEventListener('click', ()=>{
    const name=root.querySelector('#name').value.trim(); const email=root.querySelector('#email').value.trim(); const p1=pwd.value; const p2=root.querySelector('#pwd2').value;
    if(!name||!email||!p1||!p2){ toast('Please fill all fields'); return }
    if(p1!==p2){ toast('Passwords do not match'); return }
    try{ Auth.register({name,email,password:p1}); toast('Registered — please sign in'); location.hash='#/login' } catch(e){ toast(e.message) }
  })
}
