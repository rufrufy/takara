import {mkdir} from 'node:fs/promises';
import {resolve,basename} from 'node:path';
import {pathToFileURL} from 'node:url';
import {rolldown} from 'rolldown';
// Bundle source dependencies exactly as the app does, without a browser or secret environment defines.
export async function loadSource(file){
  const folder=resolve('.impeccable/test-modules');await mkdir(folder,{recursive:true});
  const output=resolve(folder,basename(file)+'.mjs');
  const build=await rolldown({input:resolve(file),cwd:process.cwd(),platform:'node',external:['@supabase/supabase-js','xlsx']});
  try{await build.write({file:output,format:'esm'});}finally{await build.close();}
  return import(pathToFileURL(output).href+'?test='+Date.now());
}
