/**
 * Source-data-driven, semantic long-form HTML. Every stage owns one continuous
 * document; text height decides layout. Real <a> tags stay clickable in place.
 * Content edits: js/content/*.js. Presentation/HTML templates stay here.
 */
import {portfolio as p} from '../data/portfolio.js';
import {STAGES} from '../data/stages.js';

const esc = value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const tags = array=>`<div class="doc-chips">${array.map((s,i)=>`<span class="doc-chip${i===0?' hot':''}">${esc(s)}</span>`).join('')}</div>`;
const para = array=>array.map(t=>`<p>${esc(t)}</p>`).join('');
const a=(url,label,extra='')=>`<a class="doc-link ${extra}" href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(label)} <span aria-hidden="true">↗</span></a>`;
const group=(title,children,id='')=>`<section class="doc-section" ${id?`id="${id}"`:''}><h2>${title}</h2>${children}</section>`;
const label = (number,title,desc='')=>`<div class="doc-bar"><span>${esc(number)}</span><strong>${esc(title)}</strong><small>${esc(desc)}</small></div>`;
const entries=(list)=>`<div class="doc-entries">${list.map((item,i)=>`<div class="doc-entry"><time>${esc(item.date)}</time><div><strong>${esc(item.name)}</strong>${item.note?`<small>${esc(item.note)}</small>`:''}</div></div>`).join('')}</div>`;
function profile(){
 return `${label('01','CHARACTER DATA','PROFILE / ABOUT / LINKS')}
 <header class="doc-heading"><span>PLAYER DATA / CYBERSECURITY STUDENT</span><h1>${esc(p.name)}</h1><p class="doc-en">${esc(p.romanName)}</p><p class="doc-affiliation">${esc(p.school)}<br>${esc(p.course)}</p><p class="doc-lead">${esc(p.tagline)}</p>${tags(p.focus)}<div class="doc-actions"><a class="doc-link doc-anchor-link" href="#profile-about">詳しく見る <span aria-hidden="true">↓</span></a>${a(p.links.github,'GitHub プロフィール')}</div></header>
 ${group(esc(p.profileContent.sectionTitles.about),para(p.about),'profile-about')}
 ${group(esc(p.profileContent.sectionTitles.role),`<p class="doc-emphasis">${esc(p.desiredRole)}</p>`)}
 ${group(esc(p.profileContent.sectionTitles.hobbies),`${tags(p.hobbies)}<p>${esc(p.hobbiesDescription)}</p>`,'profile-hobbies')}
 ${group(esc(p.profileContent.sectionTitles.links),`<p>${esc(p.socialDescription)}</p><div class="doc-links">${p.socialLinks.map(l=>a(l.url,l.label)).join('')}</div>`,'profile-links')}`;
}
function skills(){return `${label('02','SKILL TREE','LEARNING / CRAFTING')}
 <header class="doc-heading"><span>EQUIPPED ABILITIES</span><h1>${esc(p.skillsContent.heading)}</h1><p class="doc-lead">${esc(p.skillsContent.lead)}</p></header>
 ${group(esc(p.skillsContent.sectionTitles.languages),tags(p.languages),'skills-programming')}
 ${group(esc(p.skillsContent.sectionTitles.security),tags(p.security),'skills-security')}
 ${group(esc(p.skillsContent.sectionTitles.tools),tags(p.producedWith),'skills-tools')}`;}
function projects(){return `${label('03','ITEM COLLECTION','PROJECTS / BUILDS')}
 <header class="doc-heading"><span>FEATURED BUILDS</span><h1>${esc(p.projectsContent.heading)}</h1><p class="doc-lead">${esc(p.projectsContent.lead)}</p></header>
 ${p.projects.map((pr,i)=>group(`<span class="doc-num">0${i+1}</span> ${esc(pr.name)}`,`<span class="doc-type">${esc(pr.type)}</span><p>${esc(pr.description)}</p>${pr.learning?`<h3>${esc(p.projectsContent.sectionTitles.learning)}</h3><p>${esc(pr.learning)}</p>`:''}<h3>${esc(p.projectsContent.sectionTitles.tech)}</h3>${tags(pr.tech)}${pr.demoPasswordNote?`<div class="doc-note">${esc(pr.demoPasswordNote)}</div>`:''}<div class="doc-actions">${a(pr.repo,'GitHub リポジトリ')}${pr.demo?a(pr.demo,'MAP Demo'):''}</div>`,`project-${i}`)).join('')}`;}
function quests(){return `${label('04','QUEST LOG','OUTSIDE THE CLASSROOM')}
 <header class="doc-heading"><span>ACTIVITY RECORDS</span><h1>${esc(p.questsContent.heading)}</h1><p class="doc-lead">${esc(p.questsContent.lead)}</p></header>
 ${group(esc(p.questsContent.sectionTitles.activities),entries(p.activities),'quest-timeline')}
 ${group(esc(p.questsContent.sectionTitles.insight),`<p>${esc(p.activityInsight)}</p>`,'quest-insight')}`;}
function badges(){return `${label('05','ACHIEVEMENTS','COLLECTED BADGES')}
 <header class="doc-heading"><span>UNLOCKED BADGES</span><h1>${esc(p.badgesContent.heading)}</h1><p class="doc-lead">${esc(p.badgesContent.lead)}</p></header>
 ${group(esc(p.badgesContent.sectionTitles.qualifications),entries(p.qualifications),'badges-list')}
 ${group(esc(p.badgesContent.sectionTitles.next),`<div class="doc-note"><strong>学習中</strong><p>${esc(p.studying)}</p></div>`,'badges-next')}`;}
const bodies={profile,skills,projects,quests,badges};
export function renderStageDocument(stage){
 const obj=typeof stage==='number'?STAGES[stage]:stage;
 if(!obj||!bodies[obj.id])throw Error('Unknown stage');
 return `<article class="board-document" data-stage="${esc(obj.id)}" aria-label="${esc(obj.short)} のコンテンツ">${bodies[obj.id]()}<footer class="doc-footer">DAICHI QUEST // ${esc(obj.short)} <span>END OF DOCUMENT ◆</span></footer></article>`;
}
export const STAGE_LINKS = STAGES.map(stage=>{
 if(stage.id==='profile')return [{label:'GITHUB',url:p.links.github}];
 if(stage.id==='fishing')return [];
 if(stage.id==='projects')return p.projects.map(pr=>({label:pr.name,url:pr.repo})).concat([{label:'MAP DEMO',url:p.links.mapDemo}]);
 return [];
});
