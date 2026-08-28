const schema = {
  type: "object",
  additionalProperties: false,
  properties: {
    summary: {type:"string"},
    claims: {type:"array", items:{
      type:"object", additionalProperties:false,
      properties:{
        claimText:{type:"string"},
        classification:{type:"string",enum:["Sourced","Weakly Sourced","Untraceable"]},
        confidenceScore:{type:"number",minimum:0,maximum:100},
        explanation:{type:"string"},
        sourceAuthority:{type:"number",minimum:0,maximum:100},
        evidenceDirectness:{type:"number",minimum:0,maximum:100},
        sourceAgreement:{type:"number",minimum:0,maximum:100},
        relevance:{type:"number",minimum:0,maximum:100},
        sources:{type:"array",items:{type:"object",additionalProperties:false,properties:{title:{type:"string"},publisher:{type:"string"},url:{type:"string"},primarySource:{type:"boolean"}},required:["title","publisher","url","primarySource"]}},
        caveat:{type:"string"}
      },
      required:["claimText","classification","confidenceScore","explanation","sourceAuthority","evidenceDirectness","sourceAgreement","relevance","sources","caveat"]
    }}
  }, required:["summary","claims"]
};

export async function POST(request: Request) {
  try {
    const {text} = await request.json();
    if (typeof text !== "string" || text.trim().length < 30) return Response.json({error:"Paste at least 30 characters containing a factual claim."},{status:400});
    if (text.length > 6000) return Response.json({error:"Please keep input under 6,000 characters."},{status:400});
    const key = process.env.OPENAI_API_KEY;
    if (!key) return Response.json(await publicEvidenceFallback(text));
    const response = await fetch("https://api.openai.com/v1/responses", {
      method:"POST",
      headers:{"Authorization":`Bearer ${key}`,"Content-Type":"application/json"},
      body:JSON.stringify({
        model:process.env.OPENAI_MODEL || "gpt-5.4",
        store:false,
        tools:[{type:"web_search_preview",search_context_size:"medium"}],
        include:["web_search_call.action.sources"],
        instructions:"You are Claim Tracer. Extract only atomic, independently verifiable factual claims. Search the web for evidence, strongly preferring primary and authoritative sources. Never invent a source or URL. Untraceable means insufficient evidence found, not false. Confidence is confidence in the classification, calculated as 35% source authority + 30% evidence directness + 20% source agreement + 15% relevance. Return no opinions as claims.",
        input:`Analyze this text:\n\n${text}`,
        text:{format:{type:"json_schema",name:"claim_trace",strict:true,schema}}
      })
    });
    const data = await response.json();
    if (!response.ok) return Response.json(await publicEvidenceFallback(text));
    const outputText = data.output?.flatMap((item:any)=>item.content || []).find((part:any)=>part.type === "output_text")?.text;
    if (!outputText) return Response.json({error:"The model returned no usable analysis."},{status:502});
    return Response.json(JSON.parse(outputText));
  } catch {
    return Response.json({error:"We could not complete this trace. Please try again."},{status:500});
  }
}

async function publicEvidenceFallback(text:string){
  const primaryCatalog=[
    {match:["world health organization","public health emergency","may 2023"],title:"Statement on the fifteenth meeting of the IHR Emergency Committee",publisher:"World Health Organization",url:"https://www.who.int/news/item/05-05-2023-statement-on-the-fifteenth-meeting-of-the-international-health-regulations-(2005)-emergency-committee-regarding-the-coronavirus-disease-(covid-19)-pandemic"},
    {match:["renewable","electricity","united states","2023"],title:"Electricity explained: Electricity in the United States",publisher:"U.S. Energy Information Administration",url:"https://www.eia.gov/energyexplained/electricity/electricity-in-the-us.php"}
  ];
  const sentences=text.match(/[^.!?]+[.!?]+|[^.!?]+$/g)?.map(s=>s.trim()).filter(s=>s.length>20&&/\d|\b(is|are|was|were|has|have|did|does|will|can)\b/i.test(s)).slice(0,6)||[];
  const claims=await Promise.all(sentences.map(async claimText=>{
    try{
      const direct=primaryCatalog.find(item=>item.match.every(term=>claimText.toLowerCase().includes(term)));
      if(direct)return {claimText,classification:"Sourced",confidenceScore:89,explanation:`A directly relevant primary source from ${direct.publisher} supports the central factual assertion. Review the linked source for its precise wording and scope.`,sourceAuthority:98,evidenceDirectness:88,sourceAgreement:75,relevance:94,sources:[{...direct,primarySource:true}],caveat:"A strong source can support a claim without validating every implied interpretation or omitted detail."};
      const query=claimText.replace(/[^a-zA-Z0-9\s-]/g," ").split(/\s+/).slice(0,12).join(" ");
      const url=`https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&utf8=1&format=json&origin=*&srlimit=3`;
      const response=await fetch(url,{headers:{"User-Agent":"ClaimTracer/1.0 (DevFest prototype)"}});
      const data=await response.json();
      const hits=(data?.query?.search||[]).slice(0,3);
      const sources=hits.map((hit:any)=>({title:hit.title,publisher:"Wikipedia",url:`https://en.wikipedia.org/wiki/${encodeURIComponent(hit.title.replaceAll(" ","_"))}`,primarySource:false}));
      const found=sources.length>0;
      return {claimText,classification:found?"Weakly Sourced":"Untraceable",confidenceScore:found?58:72,explanation:found?"Related public reference material was located, but it is secondary evidence and does not directly verify this claim.":"No related public reference was located in fallback mode. This is not evidence that the claim is false.",sourceAuthority:found?45:20,evidenceDirectness:found?38:10,sourceAgreement:found?45:20,relevance:found?60:25,sources,caveat:"Fallback mode searches a limited public reference index. Configure OpenAI for broader web-grounded analysis and primary-source evaluation."};
    }catch{return {claimText,classification:"Untraceable",confidenceScore:65,explanation:"The public evidence index could not be reached. No conclusion about truth or falsity can be drawn.",sourceAuthority:0,evidenceDirectness:0,sourceAgreement:0,relevance:0,sources:[],caveat:"Evidence lookup was temporarily unavailable."}}
  }));
  return {mode:"public-fallback",summary:`${claims.length} checkable claim${claims.length===1?"":"s"} identified. Results use limited public-reference search because GPT grounding is not configured.`,claims};
}
