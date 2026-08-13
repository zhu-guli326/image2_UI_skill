const views=[...document.querySelectorAll("[data-view]")];
const tabs=[...document.querySelectorAll("[data-tab]")];
const feedback=document.querySelector("#feedback");
const params=new URLSearchParams(window.location.search);
let returnView="home";

if(params.has("embed")){document.documentElement.classList.add("embed-mode");const fit=()=>document.documentElement.style.setProperty("--embed-scale",String(Math.min(window.innerWidth/390,window.innerHeight / 844)));fit();window.addEventListener("resize",fit)}

function show(name){
  views.forEach((view)=>{const active=view.dataset.view===name;view.hidden=!active;view.classList.toggle("is-active",active)});
  tabs.forEach((tab)=>{const active=tab.dataset.tab===name||(name==="detail"&&tab.dataset.tab==="collection");tab.classList.toggle("is-active",active);active?tab.setAttribute("aria-current","page"):tab.removeAttribute("aria-current")});
  feedback.textContent=`${name === "detail" ? "Morning Stillness is open." : `${name[0].toUpperCase()+name.slice(1)} is open.`}`;
}
function openEntry(){returnView=document.querySelector(".view.is-active")?.dataset.view||"home";show("detail")}

tabs.forEach((tab)=>tab.addEventListener("click",()=>show(tab.dataset.tab)));
document.querySelectorAll("[data-open-entry]").forEach((button)=>button.addEventListener("click",openEntry));
document.querySelectorAll("[data-back],[data-done]").forEach((button)=>button.addEventListener("click",()=>show(returnView)));
document.querySelectorAll("[data-mood]").forEach((button)=>button.addEventListener("click",()=>{document.querySelectorAll("[data-mood]").forEach((item)=>item.classList.toggle("is-selected",item===button));feedback.textContent=`${button.dataset.mood} mood selected.`}));
document.querySelectorAll("[data-write-mood]").forEach((button)=>button.addEventListener("click",()=>{document.querySelectorAll("[data-write-mood]").forEach((item)=>item.classList.toggle("is-picked",item===button));feedback.textContent=`${button.dataset.writeMood} selected for this reflection.`}));
document.querySelector("[data-save]").addEventListener("click",()=>{show("collection");feedback.textContent="Reflection saved to your journal."});
document.querySelectorAll("[data-menu],[data-profile]").forEach((button)=>button.addEventListener("click",()=>{feedback.textContent=button.hasAttribute("data-menu")?"Journal menu opened.":"Profile is ready to edit."}));
document.querySelectorAll("[data-tag]").forEach((button)=>button.addEventListener("click",()=>{button.classList.toggle("is-picked");feedback.textContent=button.textContent.includes("Add")?"Mood tag added.":"Calm tag updated."}));
if(params.get("view")==="detail")show("detail");
