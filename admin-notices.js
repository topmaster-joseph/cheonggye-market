(()=>{
  const $=id=>document.getElementById(id);
  const route=value=>window.CGMA_ROUTE?.route(value)||value;

  function start(){
    const panel=$('noticeManager');
    if(!panel)return;
    panel.hidden=false;
    const form=$('noticeAdminForm');
    if(form)form.remove();
    const list=$('noticeAdminList');
    if(list)list.innerHTML='';
    const status=$('noticeAdminStatus');
    if(status){
      status.className='admin-resource-status';
      status.innerHTML='공지 작성·수정·삭제는 실제 사용자 화면에서 수행합니다. <a href="'+route('/#news')+'" target="_blank" rel="noopener">상인회 공지 게시판 열기 ↗</a>';
    }
    const add=$('addNoticeBtn');
    if(add){
      add.textContent='공개 게시판 열기 ↗';
      add.onclick=()=>window.open(route('/#news'),'_blank','noopener,noreferrer');
    }
  }

  window.CGMA_NOTICE_ADMIN=Object.freeze({start,load:async()=>null});
})();