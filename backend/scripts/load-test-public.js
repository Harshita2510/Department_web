import { performance } from 'node:perf_hooks';

function option(name,fallback){
  const raw=process.argv.find((value)=>value.startsWith(`--${name}=`))?.split('=').slice(1).join('=');
  return raw??fallback;
}

function integerOption(name,fallback,{minimum,maximum}){
  const value=Number(option(name,fallback));
  if(!Number.isInteger(value)||value<minimum||value>maximum)throw new Error(`--${name} must be an integer from ${minimum} to ${maximum}`);
  return value;
}

function percentile(sorted,percentage){
  if(!sorted.length)return 0;
  return sorted[Math.min(sorted.length-1,Math.ceil((percentage/100)*sorted.length)-1)];
}

const baseUrl=String(option('base-url',process.env.LOAD_TEST_BASE_URL||'http://localhost:5000/api')).replace(/\/$/,'');
const visitors=integerOption('visitors',process.env.LOAD_TEST_VISITORS||800,{minimum:1,maximum:5000});
const timeoutMs=integerOption('timeout-ms',process.env.LOAD_TEST_TIMEOUT_MS||10000,{minimum:1000,maximum:120000});
const maximumErrorPercent=Number(option('max-error-percent',process.env.LOAD_TEST_MAX_ERROR_PERCENT||1));
const maximumP95Ms=Number(option('max-p95-ms',process.env.LOAD_TEST_MAX_P95_MS||1500));
if(!Number.isFinite(maximumErrorPercent)||maximumErrorPercent<0||maximumErrorPercent>100)throw new Error('--max-error-percent must be between 0 and 100');
if(!Number.isFinite(maximumP95Ms)||maximumP95Ms<1)throw new Error('--max-p95-ms must be positive');

const endpoints=['/content/public','/placements/public'];
const latencies=[];
const statusCounts=new Map();
const failures=[];

async function request(endpoint,visitor){
  const started=performance.now();
  try{
    const response=await fetch(`${baseUrl}${endpoint}`,{
      headers:{accept:'application/json','x-request-id':`load-${visitor}-${endpoint.replace(/\W+/g,'-')}`},
      signal:AbortSignal.timeout(timeoutMs)
    });
    await response.arrayBuffer();
    latencies.push(performance.now()-started);
    statusCounts.set(response.status,(statusCounts.get(response.status)||0)+1);
    if(!response.ok)failures.push({endpoint,status:response.status});
  }catch(error){
    latencies.push(performance.now()-started);
    failures.push({endpoint,error:error.name||'RequestError'});
  }
}

let release;
const startGate=new Promise((resolve)=>{release=resolve});
const journeys=Array.from({length:visitors},(_,index)=>(async()=>{
  await startGate;
  await Promise.all(endpoints.map((endpoint)=>request(endpoint,index+1)));
})());

console.log(`Starting ${visitors} simultaneous public homepage journeys against ${baseUrl}`);
const testStarted=performance.now();
release();
await Promise.all(journeys);
const elapsedMs=performance.now()-testStarted;
const sorted=[...latencies].sort((a,b)=>a-b);
const total=visitors*endpoints.length;
const errorPercent=(failures.length/total)*100;
const metrics={
  visitors,
  requests:total,
  elapsedMs:Number(elapsedMs.toFixed(1)),
  requestsPerSecond:Number((total/(elapsedMs/1000)).toFixed(1)),
  latencyMs:{p50:Number(percentile(sorted,50).toFixed(1)),p95:Number(percentile(sorted,95).toFixed(1)),p99:Number(percentile(sorted,99).toFixed(1)),max:Number((sorted.at(-1)||0).toFixed(1))},
  errorPercent:Number(errorPercent.toFixed(2)),
  statuses:Object.fromEntries([...statusCounts.entries()].sort(([a],[b])=>a-b))
};
console.log(JSON.stringify(metrics,null,2));
if(failures.length)console.error('Sample failures:',failures.slice(0,10));
if(errorPercent>maximumErrorPercent||metrics.latencyMs.p95>maximumP95Ms){
  console.error(`FAILED thresholds: error <= ${maximumErrorPercent}% and p95 <= ${maximumP95Ms} ms`);
  process.exitCode=1;
}else{
  console.log('PASSED configured load-test thresholds');
}
