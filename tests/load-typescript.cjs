const fs=require('node:fs');
const vm=require('node:vm');
const ts=require('typescript');
module.exports=function load(file,mocks={},env={}){
 const exports={};const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
 vm.runInNewContext(code,{exports,Buffer,URL,Request,Response,console,process:{env:{DATABASE_URL:'test-only',REZIX_SESSION_SECRET:'test-secret-at-least-thirty-two-characters',...env}},require:name=>Object.hasOwn(mocks,name)?mocks[name]:require(name)});
 return exports;
};
