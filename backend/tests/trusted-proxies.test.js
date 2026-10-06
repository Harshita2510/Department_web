import assert from 'node:assert/strict';
import test from 'node:test';
import express from 'express';
import { parseTrustedProxyCidrs } from '../src/utils/trusted-proxies.js';

function observedIp(trustProxy,forwardedFor){
  const app=express();
  app.set('trust proxy',trustProxy);
  const request=Object.create(express.request);
  request.app=app;
  request.headers={'x-forwarded-for':forwardedFor};
  Object.defineProperty(request,'socket',{value:{remoteAddress:'127.0.0.1'}});
  return request.ip;
}

test('direct deployment ignores a forged X-Forwarded-For address',()=>{
  assert.equal(observedIp(false,'198.51.100.77'),'127.0.0.1');
});

test('explicitly trusted proxy networks can supply the client address',()=>{
  const ranges=parseTrustedProxyCidrs('127.0.0.0/8, ::1/128');
  assert.equal(observedIp(ranges,'198.51.100.77'),'198.51.100.77');
});

test('trusted proxy configuration rejects hop counts, booleans, hostnames and invalid CIDRs',()=>{
  for(const value of ['1','true','loopback','0.0.0.0/0','::/0','203.0.113.4/33','2001:db8::1/129']){
    assert.throws(()=>parseTrustedProxyCidrs(value));
  }
  assert.deepEqual(parseTrustedProxyCidrs('203.0.113.10, 2001:db8::/48'),['203.0.113.10','2001:db8::/48']);
});
