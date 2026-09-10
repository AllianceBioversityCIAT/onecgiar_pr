(async()=>{
 const B='http://localhost:3400/api/results-framework-reporting/';
 const H={auth:localStorage.getItem('token')};
 const get=async u=>{const r=await fetch(B+u,{headers:H});return (await r.json()).response;};
 const P='SP01';
 const units=(await get('clarisa-global-units?programId='+P)).units||[];
 const num=v=>Number(v??0)||0;
 const zt=i=>num(i.target_value_sum)===0&&num(i.actual_achieved_value_sum)===0;
 const rep=i=>num(i.actual_achieved_value_sum)>0;
 const flat=(gs,tag)=>(gs||[]).flatMap(g=>(g.indicators||[]).map(i=>({...i,__is_aow:g.is_aow,__toc:g.toc_result_id})));
 const stat=inds=>({all:inds.length,zt:inds.filter(zt).length,counted:inds.filter(i=>!zt(i)).length,reported:inds.filter(rep).length,ids:[...new Set(inds.map(i=>i.indicator_id))]});
 const out={program:P,aows:[]};
 for(const u of units){
  const t=await get('toc-results?program='+P+'&areaOfWork='+u.code);
  const o=flat(t?.tocResultsOutputs), c=flat(t?.tocResultsOutcomes);
  const so=stat(o), sc=stat(c);
  out.aows.push({code:u.code,outputs:{all:so.all,zt:so.zt,counted:so.counted,reported:so.reported},outcomes:{all:sc.all,zt:sc.zt,counted:sc.counted,reported:sc.reported,crosscut:c.filter(i=>i.__is_aow!==true).length,ownedIsAow:c.filter(i=>i.__is_aow===true).length,ids:sc.ids,groups:(t?.tocResultsOutcomes||[]).map(g=>({toc:g.toc_result_id,is_aow:g.is_aow,n:(g.indicators||[]).length}))}});
 }
 const io=flat((await get('toc-results/intermediate-outcomes?programId='+P))?.tocResults);
 const o30=flat((await get('toc-results/2030-outcomes?programId='+P))?.tocResults);
 const sio=stat(io), s30=stat(o30);
 out.intermediate={all:sio.all,zt:sio.zt,counted:sio.counted,reported:sio.reported,ids:sio.ids};
 out.o2030={all:s30.all,zt:s30.zt,counted:s30.counted,reported:s30.reported,ids:s30.ids};
 const ioSet=new Set(sio.ids), o30Set=new Set(s30.ids);
 out.overlap=out.aows.map(a=>({code:a.code,outcomeIds:a.outcomes.ids.length,inIO:a.outcomes.ids.filter(x=>ioSet.has(x)).length,in2030:a.outcomes.ids.filter(x=>o30Set.has(x)).length}));
 out.aows.forEach(a=>{delete a.outcomes.ids;});
 delete out.intermediate.ids; delete out.o2030.ids;
 const sum=(f)=>out.aows.reduce((n,a)=>n+f(a),0);
 out.totals={band_449:sum(a=>a.outputs.all+a.outcomes.all)+out.intermediate.all+out.o2030.all,hero_352:sum(a=>a.outputs.counted),table_382:sum(a=>a.outputs.counted+a.outcomes.counted),aowAll_437:sum(a=>a.outputs.all+a.outcomes.all)};
 return JSON.stringify(out);
})()
