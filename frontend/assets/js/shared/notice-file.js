export function noticeFileUrl(value,apiBaseUrl){
  try{
    const base=new URL(apiBaseUrl,window.location.href);
    const url=new URL(value,window.location.href);
    const basePath=base.pathname.replace(/\/$/,'');
    const expected=new RegExp(`^${basePath.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}/files/[a-f\\d]{24}$`,'i');
    return url.origin===base.origin&&!url.search&&!url.hash&&expected.test(url.pathname)?url.href:'';
  }catch{return ''}
}
