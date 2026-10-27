
const now=()=>new Date().toISOString();
const uuid=()=>crypto.randomUUID();
const parse=(x,fallback)=>{try{return JSON.parse(x)}catch{return fallback}};
const required=(v,name)=>{if(typeof v!=="string"||!v.trim())throw Error(name+" is required");return v.trim()};
const safeId=v=>{const s=required(v,"id");if(!/^[a-zA-Z0-9._:-]{1,100}$/.test(s))throw Error("Invalid identifier");return s};
const plain=(v,max=10000)=>String(v??"").slice(0,max);
const object=v=>v!==null&&typeof v==="object"&&!Array.isArray(v);
const arr=v=>Array.isArray(v)?v:[];
const select=async(db,q,...v)=>(await db.prepare(q).bind(...v).all()).results;
const one=async(db,q,...v)=>db.prepare(q).bind(...v).first();
const run=async(db,q,...v)=>db.prepare(q).bind(...v).run();
const bad=m=>{throw Error(m)};
const tool=(name,description,properties={},requiredKeys=[])=>({name,description,inputSchema:{type:"object",properties,required:requiredKeys,additionalProperties:false}});
const str={type:"string"}, obj={type:"object"},list={type:"array",items:str};
const EVIDENCE_TYPES=["instruction","guided_practice","independent_practice","transfer","formative_check","remediation","observation"];
const ASSISTANCE_TYPES=["independent","guided","assisted","unknown"];
const RESULT_TYPES=["correct","partial","incorrect","not_scored"];
const PROFICIENCY_STATES=["not_introduced","developing","proficient_in_covered_material","assessment_ready"];
const enumProp=(values,description)=>({type:"string",enum:values,description});
export const toolsV2=[
 tool("academic_overview","Get courses, progress, assignments, due retention, and next academically eligible work"),
 tool("list_courses","Get 41-course catalog and prerequisites"),
 tool("upsert_course","Create or update one syllabus course without issuing credit",{id:str,title:str,credits:{type:"integer"},term:{type:"integer"},prerequisites:list,objectives:list},["id","title"]),
 tool("upsert_unit","Create or update an instructional unit",{id:str,course_id:str,title:str,seq:{type:"integer"},prerequisites:list,objectives:list},["id","course_id","title"]),
 tool("upsert_competency","Create or update a measurable competency definition",{id:str,course_id:str,unit_id:str,title:str,prerequisites:list},["id","course_id","title"]),
 tool("create_assessment","Create a draft assessment and private answer key; each question has id,title,prompt,points,competency_ids,format,grading and optional diagram. Never include answers in prompts.",{id:str,course_id:str,unit_id:str,title:str,kind:str,questions:{type:"array",items:obj},passing_percent:{type:"number"}},["id","course_id","title","kind","questions"]),
 tool("publish_assessment","Freeze an assessment and publish it to the student portal",{assessment_id:str},["assessment_id"]),
 tool("assign_assessment","Assign a published assessment",{assessment_id:str,due_at:str,notes:str},["assessment_id"]),
 tool("list_assignments","List assigned and completed assessments (no answer keys)"),
 tool("list_submissions","List recent submission IDs and grading states"),
 tool("get_assessment","Get a student-facing assessment without private correct answers",{assessment_id:str},["assessment_id"]),
 tool("submit_assignment","Submit written work keyed by question ID for an assigned test",{assignment_id:str,answers:obj},["assignment_id","answers"]),
 tool("get_submission","Get student answers plus review history by submission ID",{submission_id:str},["submission_id"]),
 tool("get_grading_reference","Get frozen answer key, model solutions, scoring rubric and student working for independent grading",{submission_id:str},["submission_id"]),
 tool("grade_submission","Grade full submitted work against the frozen rubric; pass per-question earned_points, feedback and critical_error. Stores evidence, but not automatic course credit.",{submission_id:str,evaluations:{type:"array",items:obj},reviewer:str},["submission_id","evaluations"]),
 tool("record_learning","Log a lesson, diagnostic, lab, retained skill or remediation with evidence",{event_type:str,course_id:str,unit_id:str,competency_id:str,detail:obj},["event_type","detail"]),
 tool("set_competency_state","Record or correct a competency determination with evidence and reason; no unsupported mastery",{competency_id:str,state:str,percent:{type:"number"},evidence:obj,reason:str,retention_due:str},["competency_id","state","evidence","reason"]),
 tool("set_course_state","Record course state after checking prerequisites and demonstrated mastery",{course_id:str,state:str,reason:str},["course_id","state","reason"]),
 tool("get_learning_history","Read dated learning evidence, misconceptions and grading events",{course_id:str,limit:{type:"integer"}}),
 tool("set_academic_note","Save durable academic preferences, tutor checkpoints or study notes",{key:str,value:obj},["key","value"]),
 tool("list_academic_notes","List ALL saved academic note keys and values, paginated without guessed keys",{limit:{type:"integer"},offset:{type:"integer"}}),
 tool("get_competency_progress","Read formative evidence and current proficiency separately from formal scores/mastery",{competency_id:str,course_id:str}),
 tool("record_proficiency_evidence","Append lesson-level formative evidence without affecting diagnostic scores or formal mastery",{competency_id:str,course_id:str,lesson_id:str,learning_event_id:str,evidence_type:enumProp(EVIDENCE_TYPES,"Type of exercise/observation"),assistance:enumProp(ASSISTANCE_TYPES,"Assistance received"),result:enumProp(RESULT_TYPES,"Observed outcome"),score_earned:{type:"number"},score_possible:{type:"number"},detail:obj},["competency_id","course_id","evidence_type","assistance","result"]),
 tool("set_formative_proficiency","Update qualitative current proficiency and gaps without touching formal mastery percentages",{competency_id:str,proficiency_state:enumProp(PROFICIENCY_STATES,"Formative proficiency classification"),covered_concepts:list,unresolved_gaps:list,reason:str},["competency_id","proficiency_state","reason"]),
 tool("get_academic_note","Read a durable note",{key:str},["key"])
];
async function event(db,event_type,course_id,unit_id,competency_id,detail){await run(db,"INSERT INTO academy_learning_log VALUES(?,?,?,?,?,?,?)",uuid(),course_id||null,unit_id||null,competency_id||null,event_type,JSON.stringify(detail),now())}
async function courses(db){return (await select(db,"SELECT * FROM academy_courses ORDER BY term,id")).map(c=>({...c,prerequisites:parse(c.prerequisites_json,[]),objectives:parse(c.objectives_json,[]),prerequisites_json:undefined,objectives_json:undefined}))}
async function getAssessment(db,id,privateKey=false){
 const a=await one(db,"SELECT * FROM academy_assessments WHERE id=?",id);
 if(!a)bad("Assessment not found");
 const qs=parse(a.questions_json,[]);
 return {id:a.id,course_id:a.course_id,unit_id:a.unit_id,title:a.title,kind:a.kind,status:a.status,passing_percent:a.passing_percent,questions:qs.map(q=>privateKey?q:({...q,grading:undefined})),...(privateKey?{answer_key:parse(a.answer_key_json,{})}:{})};
}
function validateQuestions(questions){
 if(!Array.isArray(questions)||questions.length<1||questions.length>100)bad("Assessment must contain 1-100 questions");
 const ids=new Set(),publicQs=[],keys={};
 for(const raw of questions){
  if(!object(raw))bad("Invalid question");
  const id=safeId(raw.id);if(ids.has(id))bad("Duplicate question ID");ids.add(id);
  const prompt=required(raw.prompt,"prompt"),points=Number(raw.points??4);
  if(!Number.isFinite(points)||points<=0||points>100)bad("Points must be 0-100");
  const formats=["numeric","text","multiple_choice","worked","diagram","engineering_artifact"];
  const format=raw.format||"worked";if(!formats.includes(format))bad("Invalid answer format");
  const grading=object(raw.grading)?raw.grading:{mode:"rubric"};
  const criteria=arr(grading.criteria).map(c=>({description:plain(c.description,1000),max_points:Number(c.max_points)}));
  if(criteria.length&&!Number.isFinite(criteria.reduce((a,c)=>a+c.max_points,0)))bad("Bad rubric points");
  if(criteria.length&&Math.abs(criteria.reduce((a,c)=>a+c.max_points,0)-points)>.001)bad("Rubric points must total question points");
  const answer=raw.answer??raw.expected_answer??null;
  if(grading.mode==="numeric"&&(answer===null||!Number.isFinite(Number(answer))))bad("Numeric key requires numeric answer");
  publicQs.push({id,title:plain(raw.title||id,200),prompt,points,competency_ids:arr(raw.competency_ids).map(safeId),format,diagram:raw.diagram&&object(raw.diagram)?raw.diagram:null,options:arr(raw.options),unit:plain(raw.unit||"",60)});
  keys[id]={mode:grading.mode||"rubric",answer,absolute_tolerance:Math.max(0,Number(grading.absolute_tolerance||0)),relative_tolerance:Math.max(0,Number(grading.relative_tolerance||0)),criteria,model_solution:plain(raw.model_solution||"",8000)};
 }
 return {publicQs,keys};
}
async function summary(db){
 const cs=await courses(db), competencies=await select(db,"SELECT * FROM academy_competencies ORDER BY course_id,id"),assignments=await select(db,"SELECT a.id,a.assessment_id,a.status,a.due_at,a.assigned_at,e.title,e.course_id FROM academy_assignments a JOIN academy_assessments e ON e.id=a.assessment_id ORDER BY a.assigned_at DESC LIMIT 80"),submissions=await select(db,"SELECT id,assignment_id,assessment_id,status,grade_percent,submitted_at,graded_at FROM academy_submissions ORDER BY submitted_at DESC LIMIT 50");
 const completed=new Set(cs.filter(c=>c.status==="mastered").map(c=>c.id));
 return {courses:cs,competencies:competencies.map(x=>({...x,prerequisites:parse(x.prerequisites_json,[]),evidence:parse(x.evidence_json,[]),prerequisites_json:undefined,evidence_json:undefined})),assignments,submissions,credits_mastered:cs.filter(c=>c.status==="mastered").reduce((a,c)=>a+c.credits,0),next_eligible:cs.filter(c=>c.status!=="mastered"&&c.prerequisites.every(id=>completed.has(id))).map(c=>c.id),retention_due:competencies.filter(c=>c.retention_due&&c.retention_due<=now()).map(c=>c.id)};
}
export async function handleAcademic(env,operation,a={}){
 const db=env.DB;
 switch(operation){
 case "academic_overview":return summary(db);
 case "academic_record":{
  // Read-only student transcript view. Never mutate academic state here.
  const overview=await summary(db);
  const [units,events,notes,legacyAttempts,legacyCompetencies,proficiencies,evidences]=await Promise.all([
    select(db,"SELECT * FROM academy_units ORDER BY course_id,seq"),
    select(db,"SELECT * FROM academy_learning_log ORDER BY recorded_at DESC LIMIT 1000"),
    select(db,"SELECT key,value_json,updated_at FROM academy_kv ORDER BY key"),
    select(db,"SELECT id,exam_id,score,max_score,state,submitted_at,reviewed_at,review_json FROM attempts ORDER BY submitted_at DESC LIMIT 100"),
    select(db,"SELECT * FROM competencies ORDER BY course_id,id"),
    select(db,"SELECT * FROM academy_formative_proficiency ORDER BY competency_id"),
    select(db,"SELECT * FROM academy_formative_evidence ORDER BY recorded_at DESC LIMIT 1000")
  ]);
  const eligible=new Set(overview.next_eligible);
  return {
    ...overview,
    courses:overview.courses.map(c=>({...c,effective_status:c.status==="locked"&&eligible.has(c.id)?"eligible":c.status})),
    units:units.map(u=>({...u,prerequisites:parse(u.prerequisites_json,[]),objectives:parse(u.objectives_json,[]),prerequisites_json:undefined,objectives_json:undefined})),
    learning_events:events.map(e=>({...e,detail:parse(e.detail_json,{}),detail_json:undefined})),
    notes:notes.map(n=>({key:n.key,value:parse(n.value_json,{}),updated_at:n.updated_at})),
    formative_proficiency:proficiencies.map(p=>({...p,covered_concepts:parse(p.covered_concepts_json,[]),unresolved_gaps:parse(p.unresolved_gaps_json,[]),covered_concepts_json:undefined,unresolved_gaps_json:undefined})),
    formative_evidence:evidences.map(e=>({...e,detail:parse(e.detail_json,{}),detail_json:undefined})),
    legacy:{attempts:legacyAttempts.map(a=>({...a,review:parse(a.review_json,null),review_json:undefined})),competencies:legacyCompetencies},
    exported_at:now(),read_only:true
  };
 }
 case "list_courses":return courses(db);
 case "upsert_course":{
  const id=safeId(a.id),title=required(a.title,"title"),pre=arr(a.prerequisites).map(safeId);
  if(pre.includes(id))bad("A course cannot require itself");
  await run(db,"INSERT INTO academy_courses(id,title,credits,term,prerequisites_json,objectives_json,status,updated_at) VALUES(?,?,?,?,?,?,'locked',?) ON CONFLICT(id) DO UPDATE SET title=excluded.title,credits=excluded.credits,term=excluded.term,prerequisites_json=excluded.prerequisites_json,objectives_json=excluded.objectives_json,updated_at=excluded.updated_at",id,title,Number(a.credits||0),Number(a.term||1),JSON.stringify(pre),JSON.stringify(arr(a.objectives)),now());
  return {id,saved:true};
 }
 case "upsert_unit":{
  const id=safeId(a.id),course_id=safeId(a.course_id);if(!await one(db,"SELECT id FROM academy_courses WHERE id=?",course_id))bad("Course missing");
  await run(db,"INSERT INTO academy_units VALUES(?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET course_id=excluded.course_id,title=excluded.title,seq=excluded.seq,prerequisites_json=excluded.prerequisites_json,objectives_json=excluded.objectives_json",id,course_id,required(a.title,"title"),Number(a.seq||1),JSON.stringify(arr(a.prerequisites)),JSON.stringify(arr(a.objectives)));
  return {id,saved:true};
 }
 case "upsert_competency":{
  const id=safeId(a.id),course_id=safeId(a.course_id);if(!await one(db,"SELECT id FROM academy_courses WHERE id=?",course_id))bad("Course missing");
  await run(db,"INSERT INTO academy_competencies(id,course_id,unit_id,title,prerequisites_json,updated_at) VALUES(?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET course_id=excluded.course_id,unit_id=excluded.unit_id,title=excluded.title,prerequisites_json=excluded.prerequisites_json,updated_at=excluded.updated_at",id,course_id,a.unit_id||null,required(a.title,"title"),JSON.stringify(arr(a.prerequisites)),now());return {id,saved:true};
 }
 case "create_assessment":{
  const id=safeId(a.id),course_id=safeId(a.course_id);
  if(!await one(db,"SELECT id FROM academy_courses WHERE id=?",course_id))bad("Course missing");
  const {publicQs,keys}=validateQuestions(a.questions),pass=Number(a.passing_percent??85);
  if(pass<1||pass>100)bad("Invalid pass threshold");
  await run(db,"INSERT INTO academy_assessments VALUES(?,?,?,?,?,'draft',?,?,?,?,NULL)",id,course_id,a.unit_id||null,required(a.title,"title"),plain(a.kind,40),JSON.stringify(publicQs),JSON.stringify(keys),pass,now());
  await event(db,"assessment_created",course_id,a.unit_id,null,{id,question_count:publicQs.length});
  return {id,status:"draft",question_count:publicQs.length};
 }
 case "publish_assessment":{
  const id=safeId(a.assessment_id),row=await one(db,"SELECT status FROM academy_assessments WHERE id=?",id);
  if(!row||row.status!=="draft")bad("Assessment not a draft");
  await run(db,"UPDATE academy_assessments SET status='published',published_at=? WHERE id=? AND status='draft'",now(),id);
  return {id,status:"published"};
 }
 case "assign_assessment":{
  const assessment=await getAssessment(db,safeId(a.assessment_id));
  if(assessment.status!=="published")bad("Publish assessment first");
  const id=uuid();
  await run(db,"INSERT INTO academy_assignments(id,assessment_id,status,due_at,assigned_at,notes) VALUES(?,?,'assigned',?,?,?)",id,assessment.id,a.due_at||null,now(),plain(a.notes,3000));
  return {id,assessment_id:assessment.id,status:"assigned"};
 }
 case "list_assignments":return select(db,"SELECT a.*,e.title,e.course_id,e.kind FROM academy_assignments a JOIN academy_assessments e ON e.id=a.assessment_id ORDER BY a.assigned_at DESC");
 case "get_assessment":return getAssessment(db,safeId(a.assessment_id));
 case "list_submissions":return select(db,"SELECT id,assessment_id,assignment_id,status,grade_percent,submitted_at,graded_at FROM academy_submissions ORDER BY submitted_at DESC LIMIT 150");
 case "submit_assignment":{
  const assignment=await one(db,"SELECT * FROM academy_assignments WHERE id=?",safeId(a.assignment_id));
  if(!assignment||assignment.status!=="assigned")bad("Assignment not open");
  const exam=await getAssessment(db,assignment.assessment_id),provided=a.answers;
  if(!object(provided))bad("Answers must be an object keyed by question ID");
  const allowed=new Set(exam.questions.map(q=>q.id)),clean={};
  for(const [k,v] of Object.entries(provided)){
   if(!allowed.has(k))bad("Unknown question "+k);
   if(!object(v))bad("Each answer must contain fields");
   clean[k]={answer:plain(v.answer,2000),work:plain(v.work,20000),drawing:plain(v.drawing,200000),artifact_ref:plain(v.artifact_ref,1000)};
  }
  const id=uuid(),stamp=now();
  await db.batch([
   db.prepare("INSERT INTO academy_submissions(id,assignment_id,assessment_id,answers_json,status,submitted_at) VALUES(?,?,?,?,'submitted',?)").bind(id,assignment.id,exam.id,JSON.stringify(clean),stamp),
   db.prepare("UPDATE academy_assignments SET status='submitted' WHERE id=? AND status='assigned'").bind(assignment.id)
  ]);
  await event(db,"exam_submitted",exam.course_id,exam.unit_id,null,{submission_id:id,assignment_id:assignment.id});
  return {id,assignment_id:assignment.id,status:"submitted",submitted_at:stamp};
 }
 case "get_submission":{
  const x=await one(db,"SELECT * FROM academy_submissions WHERE id=?",safeId(a.submission_id));if(!x)bad("Submission missing");
  return {...x,answers:parse(x.answers_json,{}),answers_json:undefined,grade:parse(x.grade_json,null),grade_json:undefined};
 }
 case "get_grading_reference":{
  const x=await one(db,"SELECT * FROM academy_submissions WHERE id=?",safeId(a.submission_id));if(!x)bad("Submission missing");
  const assessment=await getAssessment(db,x.assessment_id,true);
  return {submission_id:x.id,assessment,submitted_answers:parse(x.answers_json,{}),status:x.status};
 }
 case "grade_submission":{
  const x=await one(db,"SELECT * FROM academy_submissions WHERE id=?",safeId(a.submission_id));if(!x||x.status!=="submitted")bad("Submission missing or already graded");
  const exam=await getAssessment(db,x.assessment_id,true),given=arr(a.evaluations);
  if(given.length!==exam.questions.length)bad("Every question requires a rubric evaluation");
  const evaluationMap=new Map(given.map(e=>[e.question_id,e]));
  if(evaluationMap.size!==given.length)bad("Duplicate evaluation");
  let earned=0,total=0,critical=false;const evaluations=[];
  for(const q of exam.questions){
   const e=evaluationMap.get(q.id);if(!e||typeof e.feedback!=="string"||!Number.isFinite(Number(e.earned_points)))bad("Missing or invalid grading for "+q.id);
   const key=exam.answer_key[q.id];
   let points=Number(e.earned_points);
   if(key?.mode==="numeric"){
     const submitted=parse(x.answers_json,{})[q.id]?.answer;
     const actual=Number(submitted),correct=Number(key.answer);
     const tol=Math.max(Number(key.absolute_tolerance||0),Math.abs(correct)*Number(key.relative_tolerance||0));
     points=String(submitted??"").trim()!==""&&Number.isFinite(actual)&&Math.abs(actual-correct)<=tol?q.points:0;
   }
   if(!Number.isFinite(points)||points<0||points>q.points)bad("Points outside rubric for "+q.id);
   const graded={question_id:q.id,earned_points:points,max_points:q.points,feedback:plain(e.feedback,3000),critical_error:!!e.critical_error,grading_mode:key?.mode||"rubric"};
   critical ||=graded.critical_error;earned+=points;total+=q.points;evaluations.push(graded);
  }
  const percent=Math.round(earned/total*10000)/100,gradedAt=now(),pass=percent>=exam.passing_percent&&!critical;
  const result={evaluations,earned,total,percent,passing_percent:exam.passing_percent,pass,critical_error:critical,reviewer:plain(a.reviewer||"AI rubric review",160)};
  const updated=await run(db,"UPDATE academy_submissions SET status='graded',grade_percent=?,grade_json=?,graded_at=? WHERE id=? AND status='submitted'",percent,JSON.stringify(result),gradedAt,x.id);
  if(updated.meta?.changes!==1)bad("Concurrent review detected");
  const byCompetency=new Map();
  for(let i=0;i<exam.questions.length;i++)for(const id of arr(exam.questions[i].competency_ids)){
   const prev=byCompetency.get(id)||{earned:0,total:0,critical:false};
   prev.earned+=evaluations[i].earned_points;prev.total+=evaluations[i].max_points;prev.critical ||=evaluations[i].critical_error;byCompetency.set(id,prev);
  }
  for(const [id,score] of byCompetency){
   const r=await one(db,"SELECT * FROM academy_competencies WHERE id=?",id);if(!r)continue;
   const p=score.total?Math.round(score.earned/score.total*10000)/100:0;
   await run(db,"UPDATE academy_competencies SET latest_percent=?,best_percent=max(best_percent,?),mastery_state=CASE WHEN mastery_state='mastered' THEN 'mastered' ELSE 'assessed' END,updated_at=? WHERE id=?",p,p,gradedAt,id);
  }
  await event(db,"exam_graded",exam.course_id,exam.unit_id,null,{submission_id:x.id,percent,pass,critical_error:critical});
  return {submission_id:x.id,...result,notice:"Grades are recorded as evidence, not automatic course mastery."};
 }
 case "record_learning":{
  const type=required(a.event_type,"event_type"),cid=a.course_id?safeId(a.course_id):null;
  let state_change=null;
  if(cid){
    const course=await one(db,"SELECT id,status,prerequisites_json FROM academy_courses WHERE id=?",cid);
    if(!course)bad("Course missing");
    // Lesson/activity evidence transitions a course from locked to learning,
    // provided its prerequisites are mastered. Diagnostics are still just evidence.
    const lessonEvent=/^(lesson|practice|unit|lab|studio|course_started|learning|remediation|guided_|independent_)/i.test(type);
    if(lessonEvent&&["locked","eligible"].includes(course.status)){
      for(const prerequisite of parse(course.prerequisites_json,[])){
        const p=await one(db,"SELECT status FROM academy_courses WHERE id=?",prerequisite);
        if(!p||p.status!=="mastered")bad("Cannot start course: unmastered prerequisite "+prerequisite);
      }
      await run(db,"UPDATE academy_courses SET status='learning',updated_at=? WHERE id=? AND status IN ('locked','eligible')",now(),cid);
      state_change="learning";
      await event(db,"course_state",cid,null,null,{state:"learning",reason:"Automatically started upon recorded lesson or learning activity"});
    }
  }
  await event(db,type,cid,a.unit_id,a.competency_id,object(a.detail)?a.detail:{note:plain(a.detail)});
  return {saved:true,course_state_change:state_change};
 }
 case "set_competency_state":{
  const id=safeId(a.competency_id),row=await one(db,"SELECT * FROM academy_competencies WHERE id=?",id);if(!row)bad("Competency missing");
  const states=["unassessed","learning","assessed","mastered","retention_due"];if(!states.includes(a.state))bad("Invalid competency state");
  if(a.state==="mastered"&&(!a.reason||!object(a.evidence)||!Object.keys(a.evidence).length))bad("Mastery requires evidence and reason");
  const p=a.percent===undefined?Number(row.latest_percent||0):Number(a.percent);
  if(!Number.isFinite(p)||p<0||p>100)bad("Invalid score");
  if(a.state==="mastered"&&p<85)bad("Mastery needs >=85% evidence");
  await run(db,"UPDATE academy_competencies SET mastery_state=?,latest_percent=?,best_percent=max(best_percent,?),retention_due=?,evidence_json=?,updated_at=? WHERE id=?",a.state,p,p,a.retention_due||null,JSON.stringify([...parse(row.evidence_json,[]),{timestamp:now(),state:a.state,reason:a.reason,evidence:a.evidence}]),now(),id);
  await event(db,"competency_review",row.course_id,row.unit_id,id,{state:a.state,score:p,reason:a.reason,evidence:a.evidence});
  return {id,state:a.state,percent:p};
 }
 case "set_course_state":{
  const id=safeId(a.course_id),row=await one(db,"SELECT * FROM academy_courses WHERE id=?",id);if(!row)bad("Course missing");
  const aliases={active:"learning",in_progress:"learning",started:"learning",completed:"mastered"};
  const requested=plain(a.state,40).toLowerCase(),state=aliases[requested]||requested;
  const states=["locked","eligible","learning","assessed","mastered"];if(!states.includes(state))bad("Invalid course state; valid: "+states.join(", "));
  if(!plain(a.reason,3000).trim())bad("Course-state changes require a reason");
  if(["eligible","learning","assessed","mastered"].includes(state)){
   for(const pre of parse(row.prerequisites_json,[])){const p=await one(db,"SELECT status FROM academy_courses WHERE id=?",pre);if(!p||p.status!=="mastered")bad("Unmastered prerequisite "+pre)}
  }
  if(state==="mastered"){
   const cs=await select(db,"SELECT id,mastery_state FROM academy_competencies WHERE course_id=?",id);
   if(!cs.length||cs.some(c=>c.mastery_state!=="mastered"))bad("All defined competencies must be independently mastered before course completion");
  }
  await run(db,"UPDATE academy_courses SET status=?,updated_at=? WHERE id=?",state,now(),id);
  await event(db,"course_state",id,null,null,{state:state,reason:plain(a.reason,3000)});
  return {id,state:state};
 }
 case "get_learning_history":{
  const limit=Math.min(200,Math.max(1,Number(a.limit||80)));
  return a.course_id?select(db,"SELECT * FROM academy_learning_log WHERE course_id=? ORDER BY recorded_at DESC LIMIT ?",a.course_id,limit):select(db,"SELECT * FROM academy_learning_log ORDER BY recorded_at DESC LIMIT ?",limit);
 }
 case "set_academic_note":{
  const key=safeId(a.key),value=object(a.value)?a.value:{value:a.value};
  await run(db,"INSERT INTO academy_kv VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET value_json=excluded.value_json,updated_at=excluded.updated_at",key,JSON.stringify(value),now());
  return {key,saved:true};
 }
 case "list_academic_notes":{
  const limit=Math.min(250,Math.max(1,Number(a.limit||100))),offset=Math.max(0,Number(a.offset||0));
  if(!Number.isInteger(limit)||!Number.isInteger(offset))bad("Invalid pagination");
  const entries=await select(db,"SELECT key,value_json,updated_at FROM academy_kv ORDER BY key LIMIT ? OFFSET ?",limit,offset);
  const count=await one(db,"SELECT COUNT(*) AS n FROM academy_kv");
  return {notes:entries.map(x=>({key:x.key,value:parse(x.value_json,{}),updated_at:x.updated_at})),total:count.n,limit,offset,next_offset:offset+entries.length<count.n?offset+entries.length:null};
 }
 case "get_competency_progress":{
  const cid=a.competency_id?safeId(a.competency_id):null,course=a.course_id?safeId(a.course_id):null;
  if(!cid&&!course)bad("Specify competency_id or course_id");
  const rows=cid?await select(db,"SELECT * FROM academy_competencies WHERE id=?",cid):await select(db,"SELECT * FROM academy_competencies WHERE course_id=? ORDER BY id",course);
  const results=[];
  for(const competency of rows){
   const p=await one(db,"SELECT * FROM academy_formative_proficiency WHERE competency_id=?",competency.id);
   const evidence=await select(db,"SELECT * FROM academy_formative_evidence WHERE competency_id=? ORDER BY recorded_at DESC LIMIT 250",competency.id);
   results.push({
     competency_id:competency.id,course_id:competency.course_id,title:competency.title,
     formal:{mastery_state:competency.mastery_state,best_percent:competency.best_percent,latest_percent:competency.latest_percent,retention_due:competency.retention_due,evidence:parse(competency.evidence_json,[])},
     formative:{proficiency_state:p?.proficiency_state||"not_introduced",covered_concepts:parse(p?.covered_concepts_json,[]),unresolved_gaps:parse(p?.unresolved_gaps_json,[]),last_demonstrated_at:p?.last_demonstrated_at||null,updated_at:p?.updated_at||null,evidence:evidence.map(e=>({...e,detail:parse(e.detail_json,{}),detail_json:undefined}))}
   });
  }
  return {competencies:results};
 }
 case "record_proficiency_evidence":{
  const id=safeId(a.competency_id),row=await one(db,"SELECT id,course_id FROM academy_competencies WHERE id=?",id);
  if(!row)bad("Competency missing");
  const course=safeId(a.course_id);if(row.course_id!==course)bad("Competency does not belong to specified course");
  const types=EVIDENCE_TYPES;
  const assistanceLevels=ASSISTANCE_TYPES,outcomes=RESULT_TYPES;
  if(!types.includes(a.evidence_type))bad("Invalid evidence_type "+JSON.stringify(a.evidence_type)+". Allowed: "+types.join(", "));
  if(!assistanceLevels.includes(a.assistance))bad("Invalid assistance "+JSON.stringify(a.assistance)+". Allowed: "+assistanceLevels.join(", "));
  if(!outcomes.includes(a.result))bad("Invalid result "+JSON.stringify(a.result)+". Allowed: "+outcomes.join(", "));
  const earned=a.score_earned===undefined?null:Number(a.score_earned),possible=a.score_possible===undefined?null:Number(a.score_possible);
  if((earned!==null||possible!==null)&&(!Number.isFinite(earned)||!Number.isFinite(possible)||possible<=0||earned<0||earned>possible))bad("Score must have valid earned and possible points");
  if(a.learning_event_id){const source=await one(db,"SELECT course_id,competency_id FROM academy_learning_log WHERE id=?",a.learning_event_id);if(!source)bad("Referenced learning event does not exist");if(source.course_id&&source.course_id!==course)bad("Learning event belongs to a different course");if(source.competency_id&&source.competency_id!==id)bad("Learning event belongs to a different competency");}
  const eid=uuid(),stamp=now();
  await run(db,"INSERT INTO academy_formative_evidence(id,competency_id,course_id,lesson_id,learning_event_id,evidence_type,assistance,result,score_earned,score_possible,detail_json,recorded_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)",eid,id,course,a.lesson_id||null,a.learning_event_id||null,a.evidence_type,a.assistance,a.result,earned,possible,JSON.stringify(object(a.detail)?a.detail:{}),stamp);
  // Do not infer mastery or assign numeric proficiency from guided exercises.
  await run(db,"INSERT INTO academy_formative_proficiency(competency_id,updated_at,last_demonstrated_at) VALUES(?,?,?) ON CONFLICT(competency_id) DO UPDATE SET last_demonstrated_at=excluded.last_demonstrated_at,updated_at=excluded.updated_at",id,stamp,stamp);
  return {id:eid,competency_id:id,recorded_at:stamp,saved:true,formal_mastery_unchanged:true};
 }
 case "set_formative_proficiency":{
  const id=safeId(a.competency_id),row=await one(db,"SELECT id FROM academy_competencies WHERE id=?",id);if(!row)bad("Competency missing");
  const states=PROFICIENCY_STATES;
  if(!states.includes(a.proficiency_state))bad("Invalid proficiency_state. Allowed: "+states.join(", "));
  if(!plain(a.reason).trim())bad("Reason required");
  if(["proficient_in_covered_material","assessment_ready"].includes(a.proficiency_state)){const proof=await one(db,"SELECT COUNT(*) AS n FROM academy_formative_evidence WHERE competency_id=? AND assistance='independent' AND result='correct'",id);if(!proof?.n)bad("Proficient or assessment-ready status requires at least one correct independent exercise recorded as formative evidence");}
  const concepts=arr(a.covered_concepts).map(x=>plain(x,500)),gaps=arr(a.unresolved_gaps).map(x=>plain(x,500)),stamp=now();
  await run(db,"INSERT INTO academy_formative_proficiency(competency_id,proficiency_state,covered_concepts_json,unresolved_gaps_json,updated_at) VALUES(?,?,?,?,?) ON CONFLICT(competency_id) DO UPDATE SET proficiency_state=excluded.proficiency_state,covered_concepts_json=excluded.covered_concepts_json,unresolved_gaps_json=excluded.unresolved_gaps_json,updated_at=excluded.updated_at",id,a.proficiency_state,JSON.stringify(concepts),JSON.stringify(gaps),stamp);
  await event(db,"formative_proficiency",null,null,id,{state:a.proficiency_state,reason:plain(a.reason,2000),covered_concepts:concepts,unresolved_gaps:gaps});
  return {competency_id:id,proficiency_state:a.proficiency_state,saved:true,formal_mastery_unchanged:true};
 }
 case "get_academic_note":{
  const x=await one(db,"SELECT * FROM academy_kv WHERE key=?",safeId(a.key));
  return x?{key:x.key,value:parse(x.value_json,{}),updated_at:x.updated_at}:null;
 }
 default:bad("Unknown academic operation "+operation);
 }
}
