/* ===========================================================
   📡 PROFILE API CONTRACT
   -----------------------------------------------------------

   GET  /api/client/profile
   → { id, firstName, lastName, email }

   POST /api/client/profile/update
   Body:
   { firstName, lastName }

   POST /api/client/profile/password
   Body:
   { oldPassword, newPassword }

   =========================================================== */

(function ensureApi(){
  if(!window.API) window.API = {};

  if(!API.getProfile){
    API.getProfile = async ()=>{
      return {
        id:'me',
        firstName:'Ken',
        lastName:'Billones',
        email:'ken@vetlink'
      };
    };
  }

  if(!API.updateProfile){
    API.updateProfile = async payload=>{
      return { success:true, profile:{...payload, email:'ken@vetlink'} };
    };
  }

  if(!API.changePassword){
    API.changePassword = async payload=>{
      if(payload.newPassword.length < 6)
        return { success:false, message:"Password too short" };

      return { success:true };
    };
  }
})();

(function ui(){

  const f = id => document.getElementById(id);

  const firstName = f('firstName');
  const lastName  = f('lastName');
  const email     = f('email');
  const avatar    = f('avatarInitial');

  const displayName  = f('displayName');
  const displayEmail = f('displayEmail');

  const oldPass = f('oldPass');
  const newPass = f('newPass');
  const confirmPass = f('confirmPass');

  f('notifBtn').addEventListener('click',()=>theToast('No new notifications'));
  f('cancelProfile').addEventListener('click',loadProfile);
  f('saveProfile').addEventListener('click',saveProfile);
  f('savePassword').addEventListener('click',savePassword);

  loadProfile();

  async function loadProfile(){
    const p = await API.getProfile();

    firstName.value = p.firstName;
    lastName.value  = p.lastName;
    email.value     = p.email;

    displayName.textContent  = `${p.firstName} ${p.lastName}`;
    displayEmail.textContent = p.email;

    avatar.textContent = (p.firstName || p.email).charAt(0).toUpperCase();
  }

  async function saveProfile(){
    const payload = {
      firstName:firstName.value.trim(),
      lastName:lastName.value.trim()
    };

    if(!payload.firstName || !payload.lastName){
      theToast('Please fill your full name.');
      return;
    }

    const res = await API.updateProfile(payload);
    if(res.success){
      theToast('Profile updated.');
      loadProfile();
    }
  }

  async function savePassword(){
    const oldPw = oldPass.value.trim();
    const newPw = newPass.value.trim();
    const cPw   = confirmPass.value.trim();

    if(!oldPw || !newPw || !cPw){
      theToast('Complete all password fields.');
      return;
    }
    if(newPw !== cPw){
      theToast('Passwords do not match.');
      return;
    }

    const res = await API.changePassword({
      oldPassword: oldPw,
      newPassword: newPw
    });

    if(!res.success){
      theToast(res.message || 'Failed to update password.');
      return;
    }

    theToast('Password changed successfully.');

    oldPass.value = '';
    newPass.value = '';
    confirmPass.value = '';
  }

})();
