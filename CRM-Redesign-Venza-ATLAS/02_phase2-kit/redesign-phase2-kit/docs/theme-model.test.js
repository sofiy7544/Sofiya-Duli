// Запуск: tsc apps/web/src/lib/theme/*.ts --outDir build/lib/theme --module commonjs && node docs/theme-model.test.js
const assert = require('assert');
const T = require('./build/lib/theme/themes.js');
const { themeBootstrapScript } = require('./build/lib/theme/bootstrap.js');
let n=0; const ok=(c,m)=>{assert.ok(c,m);n++;};
ok(T.THEMES.length===6,'6 themes');
ok(T.THEME_OPTIONS.map(o=>o.value).join()==='system,light,dark,sepia,atlas,venza','order');
for (const l of ['midnight','arctic','graphite','ocean','lavender','rose']) ok(!T.THEMES.includes(l),'no legacy '+l);
ok(T.normalizeTheme('midnight')==='dark' && T.normalizeTheme('rose')==='light' && T.normalizeTheme(null)==='system' && T.normalizeTheme('junk')==='system','normalize');
ok(T.getDesignFamily('atlas')==='atlas'&&T.getDesignFamily('venza')==='venza'&&T.getDesignFamily('sepia')==='classic','family');
ok(T.resolveIsDark('system',true)&&!T.resolveIsDark('system',false)&&T.resolveIsDark('dark',false),'dark resolve');
ok(!T.resolveIsDark('atlas',true)&&!T.resolveIsDark('venza',true)&&!T.resolveIsDark('sepia',true),'no stale dark');
function run(stored, osDark, prevDark=true){
  const store={}; if(stored!==undefined) store['crm-theme']=stored;
  const cls=new Set(prevDark?['dark']:[]);
  const root={classList:{toggle:(c,f)=>f?cls.add(c):cls.delete(c)},dataset:{},style:{}};
  const ctx={localStorage:{getItem:k=>k in store?store[k]:null,setItem:(k,v)=>store[k]=v},
    window:{matchMedia:()=>({matches:osDark})},document:{documentElement:root}};
  new Function('localStorage','window','document',themeBootstrapScript)(ctx.localStorage,ctx.window,ctx.document);
  return {dark:cls.has('dark'),theme:root.dataset.theme,family:root.dataset.family,stored:store['crm-theme'],scheme:root.style.colorScheme};
}
let r=run(undefined,true); ok(r.theme==='system'&&r.dark&&r.family==='classic','empty storage + OS dark');
r=run('system',false); ok(r.theme==='system'&&!r.dark&&r.stored==='system','system stays system');
r=run('atlas',true); ok(r.theme==='atlas'&&!r.dark&&r.family==='atlas','atlas clears stale .dark');
r=run('venza',true); ok(r.family==='venza'&&!r.dark,'venza');
r=run('graphite',false); ok(r.theme==='dark'&&r.dark&&r.stored==='dark','legacy graphite migrated → dark');
r=run('ocean',true); ok(r.theme==='light'&&!r.dark&&r.stored==='light','legacy ocean → light');
r=run('<script>',true); ok(r.theme==='system','garbage → system');
console.log('ALL TESTS PASSED:', n);
