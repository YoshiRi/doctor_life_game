// Build one independent HTML file from modular browser sources. Node 18+.
import {readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {dirname,resolve} from 'node:path';
const dir=resolve(dirname(fileURLToPath(import.meta.url)),'..');
let html=await readFile(resolve(dir,'index.html'),'utf8');
const styles=await readFile(resolve(dir,'styles.css'),'utf8');
html=html.replace('<link rel="stylesheet" href="styles.css" />','<style>\n'+styles+'\n</style>');
const scripts=['data','events','engine','auto','ending','ui'];
for(const s of scripts){const js=await readFile(resolve(dir,`src/${s}.js`),'utf8');html=html.replace(`<script src="src/${s}.js"></script>`,`<script>\n${js.replaceAll('</script','<\\/script')}\n</script>`);}
await writeFile(resolve(dir,'../doctoral-life-play.html'),html);
console.log('Written ../doctoral-life-play.html');
