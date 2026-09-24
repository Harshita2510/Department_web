import assert from 'node:assert/strict';
import test from 'node:test';
import { Writable } from 'node:stream';

// Opt in with a replica-set URI. Only a fresh, uniquely named test database is used.
test('faculty registration API and real transaction integration', { skip:!process.env.TEST_MONGODB_URI, timeout:300000 }, async (t) => {
  const dbName = `codex_facreg_${Date.now()}_${process.pid}`;
  Object.assign(process.env, {
    NODE_ENV:'test', MONGODB_URI:process.env.TEST_MONGODB_URI, MONGODB_DB_NAME:dbName,
    JWT_SECRET:'faculty-registration-test-secret-at-least-32-characters', FRONTEND_ORIGIN:'http://localhost:4173',
    BCRYPT_ROUNDS:'10', CLOUDINARY_CLOUD_NAME:'test', CLOUDINARY_API_KEY:'test', CLOUDINARY_API_SECRET:'test'
  });
  const { default:mongoose } = await import('mongoose');
  const { default:bcrypt } = await import('bcryptjs');
  const { app } = await import('../src/app.js');
  const { User } = await import('../src/models/user.model.js');
  const { FacultyProfile } = await import('../src/models/faculty-profile.model.js');
  const { AuditLog } = await import('../src/models/audit-log.model.js');
  const { cloudinary } = await import('../src/config/cloudinary.js');
  const { signAccessToken } = await import('../src/utils/token.js');
  let server;
  try {
    await mongoose.connect(process.env.TEST_MONGODB_URI, { dbName, serverSelectionTimeoutMS:10000 });
    await Promise.all([User.init(), FacultyProfile.init(), AuditLog.init()]);
    server = await new Promise((resolve) => { const s=app.listen(0,'127.0.0.1',()=>resolve(s)); });
    const base=`http://127.0.0.1:${server.address().port}/api`;
    const admin = await User.create({ email:'admin@example.org', role:'admin', passwordHash:'unused' });
    const token=signAccessToken(admin);
    const input={ fullName:'Test Teacher', designation:'Professor', facultyId:'EMP-001', experienceYears:'3.5', highestQualification:'PhD', areaOfSpecialisation:'Computer vision', email:'teacher@example.org', phone:'1234567890', temporaryPassword:'Temporary123' };
    const image={ bytes:Buffer.from([137,80,78,71,13,10,26,10,1,2,3]), type:'image/png', name:'photo.png' };
    let uploads, deletions, uploadFailure, cleanupFailure;
    t.mock.method(cloudinary.uploader,'upload_stream',(options,callback)=>new Writable({ write(_chunk,_encoding,done){done()}, final(done){
      uploads.push(options);
      callback(uploadFailure, uploadFailure?undefined:{ public_id:'sgsits/faculty/test-photo', secure_url:'https://example.org/photo.png' });
      done();
    } }));
    t.mock.method(cloudinary.uploader,'destroy',async(publicId)=>{
      deletions.push(publicId);
      if(cleanupFailure)throw cleanupFailure;
      return {result:'ok'};
    });
    const call=async(path,{method='GET',body,auth=token}={})=>{
      const headers=auth?{Authorization:`Bearer ${auth}`} : {};
      if(body && !(body instanceof FormData))headers['Content-Type']='application/json';
      const response=await fetch(`${base}${path}`,{method,headers,body:body instanceof FormData?body:body?JSON.stringify(body):undefined});
      return {status:response.status,cookie:response.headers.get('set-cookie'),body:await response.json().catch(()=>null)};
    };
    const register=(fields=input,photo,auth=token)=>{
      const body=new FormData();
      Object.entries(fields).forEach(([key,value])=>body.append(key,String(value)));
      if(photo)body.append('file',new Blob([photo.bytes],{type:photo.type}),photo.name);
      return call('/auth/faculty',{method:'POST',body,auth});
    };
    const empty=async()=>{
      assert.equal(await User.countDocuments({role:'faculty'}),0);
      assert.equal(await FacultyProfile.countDocuments(),0);
      assert.equal(await AuditLog.countDocuments(),0);
    };
    const scenario=async(name,run)=>t.test(name,async(st)=>{
      await Promise.all([User.deleteMany({role:'faculty'}),FacultyProfile.deleteMany({}),AuditLog.deleteMany({})]);
      uploads=[];deletions=[];uploadFailure=null;cleanupFailure=null;
      await run(st);
    });

    await scenario('photo registration publishes all fields and hashes the password',async()=>{
      const result=await register({...input,fullName:' Test Teacher ',email:' Teacher@Example.org '},image);
      assert.equal(result.status,201,JSON.stringify(result.body));
      const user=await User.findOne({facultyId:input.facultyId}).select('+passwordHash');
      assert.notEqual(user.passwordHash,input.temporaryPassword);
      assert.equal(await bcrypt.compare(input.temporaryPassword,user.passwordHash),true);
      assert.equal(user.email,'teacher@example.org');
      const profile=await FacultyProfile.findOne({user:user.id});
      assert.equal(profile.reviewStatus,'approved');assert.ok(profile.publishedAt);assert.equal(String(profile.reviewedBy),admin.id);
      for(const fields of [profile.draft,profile.approvedSnapshot]){
        assert.equal(fields.fullName,'Test Teacher');assert.equal(fields.designation,input.designation);
        assert.equal(fields.experienceYears,3.5);assert.equal(fields.highestQualification,input.highestQualification);
        assert.equal(fields.areaOfSpecialisation,input.areaOfSpecialisation);assert.equal(fields.email,'teacher@example.org');
        assert.equal(fields.phone,input.phone);assert.equal(fields.photoPublicId,'sgsits/faculty/test-photo');
        assert.equal(fields.photoUrl,'https://example.org/photo.png');
      }
      assert.equal(uploads.length,1);assert.equal(uploads[0].folder,'sgsits/faculty');assert.equal(deletions.length,0);
      const published=await call(`/faculty/public/${input.facultyId}`,{auth:null});
      assert.equal(published.status,200);assert.equal(published.body.data.draft,undefined);
      assert.ok(published.body.data.publishedAt);
      assert.equal(await AuditLog.countDocuments({action:'FACULTY_ACCOUNT_CREATED'}),1);
    });

    for(const [name,withContact,withPhoto] of [['without photo',true,false],['without contact',false,true],['without contact or photo',false,false]]){
      await scenario(`registration succeeds ${name}`,async()=>{
        const fields={...input};if(!withContact)delete fields.phone;
        assert.equal((await register(fields,withPhoto?image:undefined)).status,201);
        const profile=await FacultyProfile.findOne();
        assert.equal(profile.draft.phone,withContact?input.phone:undefined);
        assert.equal(uploads.length,withPhoto?1:0);assert.equal(deletions.length,0);
        if(!withPhoto){assert.equal(profile.draft.photoUrl,undefined);assert.equal(profile.draft.photoPublicId,undefined);}
        assert.equal((await call(`/faculty/public/${input.facultyId}`,{auth:null})).status,200);
      });
    }

    for(const field of Object.keys(input).filter((key)=>key!=='phone')){
      await scenario(`missing ${field} rejects before upload or writes`,async()=>{
        const fields={...input};delete fields[field];
        assert.equal((await register(fields,image)).status,400);
        assert.equal(uploads.length,0);await empty();
      });
    }
    for(const patch of [{email:'invalid'},{experienceYears:'-1'},{experienceYears:'abc'},{experienceYears:''}]){
      await scenario(`invalid ${JSON.stringify(patch)} rejects before upload`,async()=>{
        assert.equal((await register({...input,...patch},image)).status,400);
        assert.equal(uploads.length,0);await empty();
      });
    }
    await scenario('duplicate employee number returns a clear 409 without another upload',async()=>{
      assert.equal((await register()).status,201);
      const result=await register({...input,facultyId:' emp-001 ',email:'other@example.org'},image);
      assert.equal(result.status,409);assert.match(result.body.message,/Employee number/);
      assert.equal(uploads.length,0);assert.equal(await FacultyProfile.countDocuments(),1);
    });
    await scenario('duplicate account email returns a clear 409 before upload',async()=>{
      assert.equal((await register()).status,201);
      const result=await register({...input,facultyId:'EMP-002',email:' TEACHER@EXAMPLE.ORG '},image);
      assert.equal(result.status,409);assert.match(result.body.message,/Email ID/);assert.equal(uploads.length,0);
    });
    for(const [name,photo,status] of [
      ['invalid MIME',{...image,type:'text/plain'},415],
      ['invalid extension',{...image,name:'photo.exe'},415],
      ['spoofed signature',{...image,bytes:Buffer.from('not an image')},415],
      ['oversized',{...image,bytes:Buffer.alloc(5*1024*1024+1)},413]
    ]){
      await scenario(`${name} photo rejected before upload`,async()=>{
        assert.equal((await register(input,photo)).status,status);assert.equal(uploads.length,0);await empty();
      });
    }
    await scenario('unauthenticated registration is rejected',async()=>{
      assert.equal((await register(input,image,null)).status,401);assert.equal(uploads.length,0);await empty();
    });
    await scenario('faculty cannot register another faculty account',async()=>{
      const actor=await User.create({facultyId:'OLD-001',role:'faculty',passwordHash:'unused'});
      assert.equal((await register(input,image,signAccessToken(actor))).status,403);
      assert.equal(uploads.length,0);assert.equal(await FacultyProfile.countDocuments(),0);
      assert.equal(await User.countDocuments({role:'faculty'}),1);
    });
    await scenario('Cloudinary upload failure creates no database records',async()=>{
      uploadFailure=new Error('upload unavailable');
      assert.equal((await register(input,image)).status,502);assert.equal(deletions.length,0);await empty();
    });
    await scenario('failure after upload rolls back the account and deletes the image once',async(st)=>{
      st.mock.method(FacultyProfile,'create',async()=>{throw new Error('Profile write failed')});
      const result=await register(input,image);
      assert.equal(result.status,500);assert.equal(result.body.message,'Profile write failed');
      assert.deepEqual(deletions,['sgsits/faculty/test-photo']);await empty();
    });
    await scenario('cleanup failure logs asset and employee, preserving the original error',async(st)=>{
      st.mock.method(FacultyProfile,'create',async()=>{throw new Error('Original profile failure')});
      const logs=[];st.mock.method(console,'error',(...args)=>logs.push(args));
      cleanupFailure=new Error('Cloudinary deletion unavailable');
      const result=await register(input,image);
      assert.equal(result.status,500);assert.equal(result.body.message,'Original profile failure');
      assert.deepEqual(deletions,['sgsits/faculty/test-photo']);
      assert.equal(logs.length,1);assert.deepEqual(logs[0][1],{public_id:'sgsits/faculty/test-photo',employeeNumber:input.facultyId,reason:cleanupFailure.message});
      await empty();
    });
    await scenario('failure after both database creates rolls back the full transaction',async(st)=>{
      st.mock.method(AuditLog,'create',async()=>{throw new Error('Audit write failed')});
      const result=await register(input,image);
      assert.equal(result.status,500);assert.equal(result.body.message,'Audit write failed');
      assert.equal(deletions.length,1);await empty();
    });
    await scenario('unresponsive cleanup is bounded and still returns the original error',async(st)=>{
      st.mock.method(FacultyProfile,'create',async()=>{throw new Error('Original profile failure')});
      const logs=[];st.mock.method(console,'error',(...args)=>logs.push(args));
      st.mock.method(cloudinary.uploader,'destroy',()=>new Promise(()=>{}));
      const started=Date.now();
      const result=await register(input,image);
      assert.equal(result.status,500);assert.equal(result.body.message,'Original profile failure');
      assert.ok(Date.now()-started<12000);
      assert.equal(logs[0][1].public_id,'sgsits/faculty/test-photo');
      assert.match(logs[0][1].reason,/timed out/);await empty();
    });
    await scenario('unconfirmed cleanup result is logged rather than silently accepted',async(st)=>{
      st.mock.method(FacultyProfile,'create',async()=>{throw new Error('Original profile failure')});
      const logs=[];st.mock.method(console,'error',(...args)=>logs.push(args));
      st.mock.method(cloudinary.uploader,'destroy',async()=>({result:'error'}));
      const result=await register(input,image);
      assert.equal(result.body.message,'Original profile failure');
      assert.match(logs[0][1].reason,/did not confirm/);await empty();
    });
    await scenario('failure without photo never attempts Cloudinary cleanup',async(st)=>{
      st.mock.method(FacultyProfile,'create',async()=>{throw new Error('Profile write failed')});
      assert.equal((await register()).status,500);assert.equal(uploads.length,0);assert.equal(deletions.length,0);await empty();
    });
    await scenario('unique-index race returns 409 and cleans up the uploaded image',async(st)=>{
      st.mock.method(FacultyProfile,'exists',async()=>null);
      await FacultyProfile.create({user:new mongoose.Types.ObjectId(),facultyId:input.facultyId});
      const result=await register(input,image);
      assert.equal(result.status,409);assert.match(result.body.message,/Employee number/);
      assert.equal(await User.countDocuments({role:'faculty'}),0);assert.equal(await FacultyProfile.countDocuments(),1);
      assert.equal(deletions.length,1);
    });
    await scenario('new faculty logs in using employee number and temporary password',async()=>{
      assert.equal((await register()).status,201);
      const login=await call('/auth/login',{method:'POST',auth:null,body:{identifier:'emp-001',password:input.temporaryPassword}});
      assert.equal(login.status,200);assert.equal(login.body.data.facultyId,input.facultyId);assert.match(login.cookie,/HttpOnly/i);
    });
    await scenario('legacy faculty without new fields can log in and load their existing profile',async()=>{
      const user=await User.create({facultyId:'OLD-001',passwordHash:await bcrypt.hash('OldPassword123',10),role:'faculty'});
      await FacultyProfile.create({user:user.id,facultyId:user.facultyId,draft:{fullName:'Legacy Teacher'},approvedSnapshot:{fullName:'Legacy Teacher'},reviewStatus:'approved',publishedAt:new Date()});
      assert.equal((await call('/auth/login',{method:'POST',auth:null,body:{identifier:'OLD-001',password:'OldPassword123'}})).status,200);
      const own=await call('/faculty/me',{auth:signAccessToken(user)});
      assert.equal(own.status,200);assert.equal(own.body.data.draft.highestQualification,undefined);
      assert.equal((await call('/faculty/public/OLD-001',{auth:null})).body.data.approvedSnapshot.fullName,'Legacy Teacher');
    });
    await scenario('draft and submitted changes stay private until approval, in profile and directory',async()=>{
      assert.equal((await register()).status,201);
      const user=await User.findOne({facultyId:input.facultyId});
      const facultyToken=signAccessToken(user);
      const profile=await FacultyProfile.findOne({user:user.id});
      assert.equal((await call('/faculty/me',{method:'PATCH',auth:facultyToken,body:{fullName:'Changed Teacher',experienceYears:4.5,highestQualification:'Updated PhD'}})).status,200);
      for(const submitted of [false,true]){
        if(submitted)assert.equal((await call('/faculty/me/submit',{method:'POST',auth:facultyToken})).status,200);
        const publicProfile=await call(`/faculty/public/${input.facultyId}`,{auth:null});
        assert.equal(publicProfile.body.data.approvedSnapshot.fullName,input.fullName);assert.equal(publicProfile.body.data.draft,undefined);
        const directory=await call('/faculty/public',{auth:null});assert.equal(directory.body.data[0].approvedSnapshot.fullName,input.fullName);
      }
      assert.equal((await call(`/faculty/${profile.id}/approve`,{method:'POST'})).status,200);
      const published=await call(`/faculty/public/${input.facultyId}`,{auth:null});
      assert.equal(published.body.data.approvedSnapshot.fullName,'Changed Teacher');assert.equal(published.body.data.approvedSnapshot.experienceYears,4.5);
      assert.equal(published.body.data.approvedSnapshot.highestQualification,'Updated PhD');
    });
  } finally {
    if(server){server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
    try {
      if(mongoose.connection.readyState===1){
        assert.equal(mongoose.connection.name,dbName);
        assert.match(dbName,/^codex_facreg_\d+_\d+$/);
        await mongoose.connection.dropDatabase();
      }
    } finally { await mongoose.disconnect(); }
  }
});
