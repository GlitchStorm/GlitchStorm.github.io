import {toolsV2,handleAcademic} from "./academic.js";
// Academy Worker: authenticated single-student exam API and stateless MCP endpoint.
// Set ACADEMY_TOKEN with 'wrangler secret put ACADEMY_TOKEN' before deploying.
// Never put that token in GitHub, in URLs, or in exam submissions.
const questions = [
 ["Q01","Signed arithmetic","Calculate -8 + 3(5 - 7).","-14","numeric","arithmetic"],
 ["Q02","Linear equations","Solve 4x - 7 = 21 for x.","7","numeric","algebra"],
 ["Q03","Fractions","Calculate (3/4) + (5/6) as a decimal.","1.5833333333","numeric","arithmetic"],
 ["Q04","Exponents","Evaluate 2^3 * 2^(-1).","4","numeric","algebra"],
 ["Q05","Scientific notation","Convert 0.00042 to scientific notation (enter 4.2e-4).","0.00042","numeric","units"],
 ["Q06","Units","Convert 2.5 inches to millimeters.","63.5","numeric","units"],
 ["Q07","Percentages","A part costing $80 rises by 15%. What is the new price?","92","numeric","algebra"],
 ["Q08","Linear graph","For y = 2x + 1, find y when x = 3.","7","numeric","functions"],
 ["Q09","Slope","Find the slope of the line through (2, 5) and (6, 17).","3","numeric","functions"],
 ["Q10","Quadratic roots","Give the larger real root of x² - 5x + 6 = 0.","3","numeric","algebra"],
 ["Q11","Functions","Find f(-2) for f(x) = 2x² - 3x + 1.","15","numeric","functions"],
 ["Q12","Systems","Given x + y = 10 and 2x - y = 5, find x.","5","numeric","algebra"],
 ["Q13","Systems","For the same equations, find y.","5","numeric","algebra"],
 ["Q14","Right triangles","Find the hypotenuse of a right triangle with legs 6 cm and 8 cm.","10","numeric","geometry"],
 ["Q15","Trigonometry","Find the opposite leg (cm) for a 30° angle and hypotenuse 12 cm.","6","numeric","trigonometry"],
 ["Q16","Radians","Convert 180 degrees to radians, rounded to 3 decimals.","3.142","numeric","trigonometry"],
 ["Q17","Vectors","For displacement 3 m east and 4 m north, find the magnitude in meters.","5","numeric","vectors"],
 ["Q18","Vector angles","For displacement 3 m east and 4 m north, find the angle north of east in degrees (1 decimal).","53.1","numeric","vectors"],
 ["Q19","Velocity units","Convert 300 mm/s to m/s.","0.3","numeric","units"],
 ["Q20","Graph interpretation","A position-time line passes through (2 s, 5 m) and (6 s, 17 m). Find velocity in m/s.","3","numeric","functions"]
].map(([id,title,prompt,answer,type,competency])=>({id,title,prompt,answer,type,competency,points:4}));
const publicExam = () => ({id:"MTH101-PLACEMENT-01",course_id:"MTH101",title:"MTH101 Mathematics Placement",questions:questions.map(({answer,...q})=>q),max_score:80,passing_percent:85,grading:"2 answer points auto-scored; 2 method/reasoning points require review"});
const ts=()=>new Date().toISOString();
const json=(data,status=200,extra={})=>new Response(JSON.stringify(data),{status,headers:{"content-type":"application/json; charset=utf-8",...extra}});
const scoreAnswer=(a,q)=>{
 const raw=String(a?.answer??"").trim().replace(/,/g,""); const n=Number(raw);
 if(!raw||!Number.isFinite(n))return 0;
 const target=Number(q.answer);
 return Math.abs(n-target)<=Math.max(0.002,Math.abs(target)*0.00001)?2:0;
};
function cors(request,env){
 const origin=request.headers.get("Origin");
 const allowed=[env.ALLOWED_ORIGIN,"http://localhost:8000","http://127.0.0.1:8000"].filter(Boolean);
 if(origin&&!allowed.includes(origin))return null;
 return origin?{"Access-Control-Allow-Origin":origin,"Vary":"Origin","Access-Control-Allow-Headers":"Authorization,Content-Type,MCP-Protocol-Version,Mcp-Method,Mcp-Name","Access-Control-Allow-Methods":"GET,POST,OPTIONS"}:{};
}
async function api(path,method,body,env){
 if(path==="/api/exams"&&method==="GET")return [publicExam()];
 if(path==="/api/progress"&&method==="GET"){
   const c=await env.DB.prepare("SELECT * FROM competencies ORDER BY course_id,id").all();
   const a=await env.DB.prepare("SELECT id,exam_id,score,max_score,state,submitted_at,reviewed_at FROM attempts ORDER BY submitted_at DESC LIMIT 30").all();
   return {competencies:c.results,attempts:a.results,modeled_credits:128};
 }
 if(path==="/api/attempts"&&method==="GET"){
   return (await env.DB.prepare("SELECT id,exam_id,score,max_score,state,submitted_at,reviewed_at FROM attempts ORDER BY submitted_at DESC LIMIT 100").all()).results;
 }
 if(path==="/api/attempts"&&method==="POST"){
   if(body?.exam_id!=="MTH101-PLACEMENT-01"||!body?.answers||typeof body.answers!=="object"||Array.isArray(body.answers))throw Error("Invalid exam or answers");
   const clean={};
   for(const q of questions){
     const a=body.answers[q.id]||{};
     clean[q.id]={answer:String(a.answer??"").slice(0,150),work:String(a.work??"").slice(0,12000),drawing:String(a.drawing??"").slice(0,180000)};
   }
   const score=questions.reduce((s,q)=>s+scoreAnswer(clean[q.id],q),0);
   const id=crypto.randomUUID(),submitted=ts();
   await env.DB.prepare("INSERT INTO attempts(id,exam_id,answers_json,score,max_score,state,submitted_at) VALUES(?,?,?,?,?,'submitted',?)")
     .bind(id,body.exam_id,JSON.stringify(clean),score,80,submitted).run();
   return {id,state:"submitted",auto_scored_points:score,maximum_auto_points:40,max_score:80,submitted_at:submitted,notice:"Provisional objective subtotal only. Method and reasoning require independent review."};
 }
 const attemptPath=path.match(/^\/api\/attempts\/([a-f0-9-]+)$/);
 if(attemptPath&&method==="GET"){
   const row=await env.DB.prepare("SELECT * FROM attempts WHERE id=?").bind(attemptPath[1]).first();
   if(!row)throw Error("Attempt not found");
   return {...row,answers:JSON.parse(row.answers_json),answers_json:undefined,review:row.review_json?JSON.parse(row.review_json):null,review_json:undefined};
 }
 if(path==="/api/reviews"&&method==="POST"){
   if(!body?.attempt_id||!Array.isArray(body?.rubric)||body.rubric.length!==20)throw Error("Expected attempt_id and 20 rubric evaluations");
   const a=await env.DB.prepare("SELECT * FROM attempts WHERE id=?").bind(body.attempt_id).first();
   if(!a||a.state!=="submitted")throw Error("Attempt missing or already reviewed");
   const checks=[];
   for(let i=0;i<20;i++){
     const item=body.rubric[i],q=questions[i];
     if(item?.question_id!==q.id||!Number.isInteger(item.method_points)||item.method_points<0||item.method_points>2||typeof item.feedback!=="string")throw Error("Invalid rubric for "+q.id);
     checks.push({question_id:q.id,answer_points:scoreAnswer(JSON.parse(a.answers_json)[q.id],q),method_points:item.method_points,feedback:item.feedback.slice(0,2000)});
   }
   const score=checks.reduce((s,x)=>s+x.answer_points+x.method_points,0);
   const review={rubric:checks,reviewer:typeof body.reviewer==="string"?body.reviewer.slice(0,120):"manual",critical_errors:!!body.critical_errors};
   const now=ts();
   await env.DB.prepare("UPDATE attempts SET score=?,state='reviewed',reviewed_at=?,review_json=? WHERE id=? AND state='submitted'")
     .bind(score,now,JSON.stringify(review),a.id).run();
   const rate=score/80;
   // Placement only informs status; it never certifies course mastery or retention.
   for(const competency of new Set(questions.map(q=>q.competency))){
     const relevant=checks.filter(x=>questions.find(q=>q.id===x.question_id).competency===competency);
     const p=relevant.reduce((s,x)=>s+x.answer_points+x.method_points,0)/(relevant.length*4);
     await env.DB.prepare("INSERT INTO competencies(id,course_id,state,best_score,evidence,updated_at) VALUES(?,'MTH101','assessed',?,'A',?) ON CONFLICT(id) DO UPDATE SET best_score=max(best_score,excluded.best_score),updated_at=excluded.updated_at")
       .bind("MTH101:"+competency,p,now).run();
   }
   return {attempt_id:a.id,score,max_score:80,percent:Math.round(rate*1000)/10,placement_pass:rate>=0.85&&!review.critical_errors,course_mastered:false,review};
 }
 throw Error("Unsupported operation");
}
const definitions=[
 {name:"list_exams",description:"List available exam forms without answer keys",inputSchema:{type:"object",properties:{}}},
 {name:"get_progress",description:"Retrieve persisted assessment results and competency evidence",inputSchema:{type:"object",properties:{}}},
 {name:"list_attempts",description:"List submitted and graded exam attempts",inputSchema:{type:"object",properties:{}}},
 {name:"get_attempt",description:"Retrieve one attempt and the student's submitted work",inputSchema:{type:"object",properties:{id:{type:"string"}},required:["id"]}},
 {name:"review_attempt",description:"Record 20 independently evaluated method/reasoning rubric scores (0-2) and feedback; requires reviewer to examine submitted work",inputSchema:{type:"object",properties:{attempt_id:{type:"string"},rubric:{type:"array",items:{type:"object",properties:{question_id:{type:"string"},method_points:{type:"integer",minimum:0,maximum:2},feedback:{type:"string"}},required:["question_id","method_points","feedback"]}},reviewer:{type:"string"},critical_errors:{type:"boolean"}},required:["attempt_id","rubric"]}}
];
async function mcp(body,env){
 if(body.method==="notifications/initialized")return null;
 if(body.method==="initialize")return {protocolVersion:"2025-11-25",capabilities:{tools:{}},serverInfo:{name:"mechatronics-academy",version:"0.2.0"}};
 if(body.method==="ping")return {};
 if(body.method==="tools/list")return {tools:[...definitions,...toolsV2]};
 if(body.method==="tools/call"){
  const p=body.params||{};let data;
  if(toolsV2.some(t=>t.name===p.name)){ const result=await handleAcademic(env,p.name,p.arguments||{});return {content:[{type:"text",text:JSON.stringify(result)}]}; }
  switch(p.name){
   case "list_exams":data=await api("/api/exams","GET",{},env);break;
   case "get_progress":data=await api("/api/progress","GET",{},env);break;
   case "list_attempts":data=await api("/api/attempts","GET",{},env);break;
   case "get_attempt":data=await api("/api/attempts/"+p.arguments?.id,"GET",{},env);break;
   case "review_attempt":data=await api("/api/reviews","POST",p.arguments,env);break;
   default:throw Error("Unknown tool");
  }
  return {content:[{type:"text",text:JSON.stringify(data)}]};
 }
 throw Error("Unknown MCP method");
}
export default {async fetch(request,env){
 const url=new URL(request.url),headers=cors(request,env);
 if(!headers)return json({error:"Origin not permitted"},403);
 if(request.method==="OPTIONS")return new Response(null,{status:204,headers});
 if(url.pathname==="/health")return json({service:"mechatronics-academy",status:"ok"},200,headers);
 try{
  if(url.pathname==="/mcp"){
   if(request.method!=="POST")return json({error:"POST required"},405,headers);
   const body=await request.json();
   if(Array.isArray(body))return json({error:"Batch unsupported"},400,headers);
   if(body.method==="notifications/initialized")return new Response(null,{status:202,headers});
   const result=await mcp(body,env);
   return json({jsonrpc:"2.0",id:body.id??null,result},200,headers);
  }
  if(url.pathname.startsWith("/api/v2/")){
   const operation=url.pathname.slice("/api/v2/".length);
   const body=request.method==="POST"?await request.json():{};
   if(request.method==="GET"&&!["academic_overview","academic_record","list_courses","list_assignments"].includes(operation))return json({error:"POST required"},405,headers);
   return json(await handleAcademic(env,operation,body),200,headers);
  }
  if(!url.pathname.startsWith("/api/"))return json({error:"Not found"},404,headers);
  const body=request.method==="POST"?await request.json():{};
  return json(await api(url.pathname,request.method,body,env),200,headers);
 }catch(e){return json({error:String(e.message||e)},400,headers);}
}};
