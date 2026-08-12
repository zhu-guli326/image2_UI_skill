const views=[...document.querySelectorAll("[data-view]")];
const moodTrack=document.querySelector("#moodTrack");
const moodLabel=document.querySelector("#moodLabel");
const feedback=document.querySelector("#feedback");
const moods=["Anxious","Low","Okay","Happy","Great"];
const params=new URLSearchParams(window.location.search);

if(params.has("embed")){document.documentElement.classList.add("embed-mode");const fit=()=>document.documentElement.style.setProperty("--embed-scale",String(Math.min(window.innerWidth/390,window.innerHeight/693.3333)));fit();window.addEventListener("resize",fit)}
function show(name){views.forEach((view)=>{const active=view.dataset.view===name;view.hidden=!active;view.classList.toggle("is-active",active)});document.body.classList.toggle("is-confirm",name==="confirm");feedback.textContent=name==="confirm"?"Your check-in is complete.":"Choose the feeling that is closest right now."}
function chooseMood(name){const index=moods.indexOf(name);moodTrack.querySelector(".mood-knob").style.left=`calc(${index*25}% + ${index===0?5:index===4?-37:-16}px)`;moodLabel.textContent=name;feedback.textContent=`${name} selected.`}
document.querySelectorAll("[data-mood]").forEach((button)=>button.addEventListener("click",()=>chooseMood(button.dataset.mood)));
document.querySelector("[data-next]").addEventListener("click",()=>show("confirm"));
document.querySelector("[data-complete]").addEventListener("click",()=>show("checkin"));
document.querySelector("[data-close]").addEventListener("click",()=>{chooseMood("Happy");feedback.textContent="Check-in reset."});
if(params.get("view")==="confirm")show("confirm");
