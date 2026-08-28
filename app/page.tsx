"use client";
import {useMemo,useState} from "react";

type Source={title:string;publisher:string;url:string;primarySource:boolean};
type Claim={claimText:string;classification:"Sourced"|"Weakly Sourced"|"Untraceable";confidenceScore:number;explanation:string;sourceAuthority:number;evidenceDirectness:number;sourceAgreement:number;relevance:number;sources:Source[];caveat:string};
type Result={summary:string;claims:Claim[];mode?:"public-fallback"};

const samples=[
  {label:"Climate & energy",text:"In 2023, renewable energy supplied more than 20% of total U.S. electricity generation. Solar was the fastest-growing source of new generating capacity."},
  {label:"Public health",text:"The World Health Organization declared the end of COVID-19 as a public health emergency of international concern in May 2023. It also said COVID-19 was no longer a global health threat."}
];

function Badge({kind}:{kind:Claim["classification"]}){return <span className={`badge ${kind.toLowerCase().replaceAll(" ","-")}`}>{kind}</span>}
function Gauge({label,value,weight}:{label:string;value:number;weight:string}){return <div className="gauge"><div><span>{label}</span><small>{weight}</small><b>{Math.round(value)}</b></div><i><em style={{width:`${value}%`}}/></i></div>}

export default function Home(){
  const [text,setText]=useState(""); const [result,setResult]=useState<Result|null>(null); const [loading,setLoading]=useState(false); const [error,setError]=useState("");
  const counts=useMemo(()=>result?.claims.reduce((a,c)=>({...a,[c.classification]:(a[c.classification]||0)+1}),{} as Record<string,number>)||{},[result]);
  async function trace(){setError("");setResult(null);if(text.trim().length<30){setError("Add a little more context—at least 30 characters.");return}setLoading(true);try{const r=await fetch("/api/analyze",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({text})});const d=await r.json();if(!r.ok)throw new Error(d.error||"Analysis failed");setResult(d)}catch(e){setError(e instanceof Error?e.message:"Analysis failed")}finally{setLoading(false)}}
  return <main>
    <nav><a className="brand" href="#top"><span>CT</span><b>Claim Tracer</b></a><div><a href="#method">Method</a><a href="#limits">Limitations</a><span className="team">ctrl+alt+trio</span></div></nav>
    <section className="hero" id="top"><div className="eyebrow">Evidence intelligence · DevFest DC 2026</div><h1>Trace the claim.<br/><em>See the evidence.</em></h1><p>Turn a dense post into checkable facts, then see what credible sources actually support—and what remains uncertain.</p></section>
    <section className="workspace">
      <div className="inputHead"><div><span className="step">01</span><h2>Paste something worth checking</h2></div><span>{text.length.toLocaleString()} / 6,000</span></div>
      <textarea value={text} maxLength={6000} onChange={e=>setText(e.target.value)} placeholder="Paste a social post, article excerpt, or public statement…" aria-label="Text to trace"/>
      <div className="actions"><div className="samples"><span>Try a sample</span>{samples.map(s=><button key={s.label} onClick={()=>{setText(s.text);setResult(null);setError("")}}>{s.label}</button>)}</div><button className="trace" onClick={trace} disabled={loading}>{loading?<><i/>Tracing evidence…</>:<>Trace claims <span>→</span></>}</button></div>
      {error&&<div className="error"><b>Analysis paused</b><span>{error}</span></div>}
    </section>
    {!result&&!loading&&<section className="before"><div><span>01</span><b>Extract</b><p>Separate checkable facts from opinions and rhetoric.</p></div><div><span>02</span><b>Search</b><p>Prioritize primary and authoritative evidence.</p></div><div><span>03</span><b>Explain</b><p>Show support, uncertainty, and every source.</p></div></section>}
    {loading&&<section className="loading"><div className="scan"/><h2>Following the evidence trail</h2><p>Extracting atomic claims, searching credible sources, and measuring support…</p></section>}
    {result&&<section className="results">{result.mode==="public-fallback"&&<div className="modeNotice"><b>Limited evidence mode</b><span>This report uses live public-reference search, not full GPT web grounding. Sources are real, but coverage is intentionally narrow.</span></div>}<header><div><span className="step">02</span><h2>Evidence report</h2><p>{result.summary}</p></div><div className="totals"><b>{result.claims.length}<small>Claims</small></b><b className="green">{counts.Sourced||0}<small>Sourced</small></b><b className="amber">{counts["Weakly Sourced"]||0}<small>Weak</small></b><b>{counts.Untraceable||0}<small>Untraceable</small></b></div></header>
      <div className="claimList">{result.claims.map((c,i)=><article className="claim" key={i}><div className="claimTop"><span className="num">{String(i+1).padStart(2,"0")}</span><div><Badge kind={c.classification}/><h3>{c.claimText}</h3></div><div className="score"><b>{Math.round(c.confidenceScore)}</b><span>% confidence<br/>in classification</span></div></div><p className="explain">{c.explanation}</p><div className="details"><div className="gauges"><h4>Confidence breakdown</h4><Gauge label="Source authority" value={c.sourceAuthority} weight="35%"/><Gauge label="Evidence directness" value={c.evidenceDirectness} weight="30%"/><Gauge label="Source agreement" value={c.sourceAgreement} weight="20%"/><Gauge label="Relevance" value={c.relevance} weight="15%"/></div><div className="sources"><h4>Evidence sources</h4>{c.sources.length?c.sources.map((s,j)=><a href={s.url} target="_blank" rel="noreferrer" key={j}><span>{s.primarySource?"Primary":"Supporting"}</span><b>{s.title}</b><small>{s.publisher} ↗</small></a>):<p>No sufficiently credible source was located.</p>}</div></div>{c.caveat&&<div className="caveat"><b>Keep in mind</b>{c.caveat}</div>}</article>)}</div>
    </section>}
    <section className="method" id="method"><div><span className="kicker">Our method</span><h2>Not a truth machine.<br/>An evidence map.</h2><p>Claim Tracer measures how well available evidence supports a classification. It does not assign a probability that a statement is true.</p></div><div className="definitions"><article><b>Sourced</b><p>Directly supported by credible, preferably primary evidence.</p></article><article><b>Weakly Sourced</b><p>Related evidence exists, but it is indirect, incomplete, secondary, or ambiguous.</p></article><article><b>Untraceable</b><p>No sufficiently credible evidence was found. This does not mean false.</p></article></div></section>
    <section className="limits" id="limits"><span>Built-in honesty</span><div><h2>What Claim Tracer cannot determine</h2><p>It cannot prove absolute truth or falsity. Relevant evidence may be new, paywalled, poorly indexed, outside the searchable web, or written in another language. Results should be a starting point for verification—not a final verdict.</p></div></section>
    <footer><b>Claim Tracer</b><span>Built by ctrl+alt+trio for DevFest DC 2026</span><a href="#top">Back to top ↑</a></footer>
  </main>
}
