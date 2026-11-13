/**
 * 5ステージの編集用データをまとめてUIへ渡すだけのファイル。
 * 文章・項目を編集するときは js/content/*.js を変更してください。
 */
import {PROFILE_CONTENT} from '../content/profile.js';
import {SKILLS_CONTENT} from '../content/skills.js';
import {PROJECTS_CONTENT} from '../content/projects.js';
import {QUESTS_CONTENT} from '../content/quests.js';
import {BADGES_CONTENT} from '../content/badges.js';
import {LINKS,SOCIAL_LINKS} from '../content/links.js';

export const portfolio = {
  ...PROFILE_CONTENT,
  languages: SKILLS_CONTENT.languages,
  security: SKILLS_CONTENT.security,
  producedWith: SKILLS_CONTENT.producedWith,
  projects: PROJECTS_CONTENT.projects,
  activities: QUESTS_CONTENT.activities,
  activityInsight: QUESTS_CONTENT.activityInsight,
  qualifications: BADGES_CONTENT.qualifications,
  studying: BADGES_CONTENT.studying,
  profileContent: PROFILE_CONTENT,
  skillsContent: SKILLS_CONTENT,
  projectsContent: PROJECTS_CONTENT,
  questsContent: QUESTS_CONTENT,
  badgesContent: BADGES_CONTENT,
  socialLinks: SOCIAL_LINKS,
  links: LINKS,
};
