const {execFileSync}=require('node:child_process');
const {createRequire}=require('node:module');
const path=require('node:path');
const req=createRequire(path.join(__dirname,'src-admin/package.json'));
async function build(){
 await req('esbuild').build({entryPoints:['lib/admin-model.js'],bundle:true,platform:'browser',format:'esm',outfile:'src-admin/src/model.mjs'});
 execFileSync(process.execPath,[path.join(path.dirname(req.resolve('vite/package.json')),'bin/vite.js'),'build'],{cwd:path.join(__dirname,'src-admin'),stdio:'inherit'});
 require('node:fs').unlinkSync('admin/custom/index.html');
}
build().catch(e=>{console.error(e);process.exitCode=1;});

