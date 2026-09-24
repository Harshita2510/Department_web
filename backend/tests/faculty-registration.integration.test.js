import assert from 'node:assert/strict';
import test from 'node:test';

// Opt in with a replica-set URI. Only a fresh, uniquely named test database is used.
test('faculty account, password gate and approval workflow', { skip:!process.env.TEST_MONGODB_URI, timeout:300000 }, async()=>{
  const dbName=`codex_facreg_${Date.now()}_${process.pid}`;
  Object.assign(process.env,{
    NODE_ENV:'test',MONGODB_URI:process.env.TEST_MONGODB_URI,MONGODB_DB_NAME:dbName,
    JWT_SECRET:'faculty-registration-test-secret-at-least-32-characters',FRONTEND_ORIGIN:'http://localhost:4173',
    BCRYPT_ROUNDS:'10',CLOUDINARY_CLOUD_NAME:'test',CLOUDINARY_API_KEY:'test',CLOUDINARY_API_SECRET:'test'
  });
  const {default:mongoose}=await import('mongoose');
  const {default:bcrypt}=await import('bcryptjs');
  const {app}=await import('../src/app.js');
  const {User}=await import('../src/models/user.model.js');
  const {FacultyProfile}=await import('../src/models/faculty-profile.model.js');
  const {AuditLog}=await import('../src/models/audit-log.model.js');
  const {signAccessToken}=await import('../src/utils/token.js');
  let server;
  try{
    await mongoose.connect(process.env.TEST_MONGODB_URI,{dbName,serverSelectionTimeoutMS:10000});
    await Promise.all([User.init(),FacultyProfile.init(),AuditLog.init()]);
    server=await new Promise((resolve)=>{const instance=app.listen(0,'127.0.0.1',()=>resolve(instance))});
    const base=`http://127.0.0.1:${server.address().port}/api`;
    const admin=await User.create({email:'admin@example.org',role:'admin',passwordHash:'unused',mustChangePassword:false});
    const call=async(path,{method='GET',body,auth=signAccessToken(admin)}={})=>{
      const headers={'Content-Type':'application/json'};
      if(auth)headers.Authorization=`Bearer ${auth}`;
      const response=await fetch(`${base}${path}`,{method,headers,body:body?JSON.stringify(body):undefined});
      return {status:response.status,body:await response.json().catch(()=>null)};
    };

    const registration={facultyId:'EMP-001',temporaryPassword:'Temporary123'};
    const created=await call('/auth/faculty',{method:'POST',body:registration});
    assert.equal(created.status,201,JSON.stringify(created.body));
    const faculty=await User.findOne({facultyId:'EMP-001'}).select('+passwordHash');
    assert.equal(await bcrypt.compare(registration.temporaryPassword,faculty.passwordHash),true);
    assert.equal(faculty.mustChangePassword,true);
    const profile=await FacultyProfile.findOne({user:faculty.id});
    assert.equal(profile.reviewStatus,'draft');
    assert.equal(profile.approvedSnapshot,null);
    assert.equal(profile.publishedAt,undefined);
    assert.equal((await call('/faculty/public/EMP-001',{auth:null})).status,404);

    const temporaryToken=signAccessToken(faculty);
    assert.equal((await call('/faculty/me',{method:'PATCH',auth:temporaryToken,body:{fullName:'Blocked'}})).status,403);
    const changed=await call('/auth/password',{method:'PATCH',auth:temporaryToken,body:{currentPassword:'Temporary123',newPassword:'PermanentPassword123'}});
    assert.equal(changed.status,200,JSON.stringify(changed.body));
    const refreshed=await User.findById(faculty.id);
    assert.equal(refreshed.mustChangePassword,false);
    const facultyToken=signAccessToken(refreshed);
    const details={fullName:'Test Teacher',designation:'Professor',department:'Other department',email:'teacher@sgsits.ac.in',experienceYears:3.5,highestQualification:'PhD',areaOfSpecialisation:'Computer vision',photoUrl:'https://res.cloudinary.com/demo/image/upload/faculty/photo.png'};
    assert.equal((await call('/faculty/me',{method:'PATCH',auth:facultyToken,body:details})).status,200);
    assert.equal((await call('/faculty/me/submit',{method:'POST',auth:facultyToken})).status,200);
    const submitted=await FacultyProfile.findById(profile.id);
    assert.equal(submitted.draft.department,'Computer Science & Engineering');
    assert.equal(submitted.reviewStatus,'submitted');
    assert.equal((await call('/faculty/public/EMP-001',{auth:null})).status,404);

    assert.equal((await call(`/faculty/${profile.id}`,{method:'PATCH',body:{fullName:'Admin edit'}})).status,404);
    assert.equal((await call(`/faculty/${profile.id}/approve`,{method:'POST'})).status,200);
    const published=await call('/faculty/public/EMP-001',{auth:null});
    assert.equal(published.status,200);
    assert.equal(published.body.data.approvedSnapshot.fullName,'Test Teacher');
    assert.equal(published.body.data.approvedSnapshot.photoUrl,details.photoUrl);
    const deleted=await call(`/faculty/${profile.id}`,{method:'DELETE'});
    assert.equal(deleted.status,204,JSON.stringify(deleted.body));
    assert.equal(await FacultyProfile.findById(profile.id),null);
    assert.equal(await User.findById(faculty.id),null);
    assert.equal((await call('/faculty/public/EMP-001',{auth:null})).status,404);
  }finally{
    if(server){server.closeAllConnections();await new Promise((resolve)=>server.close(resolve))}
    try{if(mongoose.connection.readyState===1){assert.equal(mongoose.connection.name,dbName);await mongoose.connection.dropDatabase()}}
    finally{await mongoose.disconnect()}
  }
});
